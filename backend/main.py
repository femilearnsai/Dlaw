import os
import shutil
import hashlib
import re
from typing import List, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from supabase.client import create_client, Client
from sentence_transformers import CrossEncoder
import pdfplumber
import pytesseract
from pdf2image import convert_from_path

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GOOGLE_API_KEY:
    print("WARNING: Missing environment variables. Check .env file.")

app = FastAPI()

# Allow Frontend to talk to Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CLIENTS ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1)

# Initialize Cross-Encoder for Re-ranking (downloaded on first run)
try:
    cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
except Exception as e:
    print(f"Warning: CrossEncoder failed to load: {e}")
    cross_encoder = None


# --- HELPER: LOGGING ---
def log_ingestion_error(file_name: str, stage: str, error_msg: str):
    """Log ingestion failures to Supabase for debugging."""
    try:
        supabase.table("ingestion_logs").insert({
            "file_name": file_name,
            "stage": stage,
            "error_message": str(error_msg)
        }).execute()
    except Exception as e:
        print(f"Failed to write to ingestion_logs: {e}")

# --- HELPER: ADVANCED EXTRACTION ---
def extract_text_from_pdf(file_path: str) -> List[Document]:
    """
    Extracts text using pdfplumber (better for tables). 
    Falls back to OCR (pytesseract) for scanned pages.
    """
    documents = []
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                # 1. Try standard text extraction
                text = page.extract_text(x_tolerance=2, y_tolerance=2)
                
                # 2. Check for Scanned Page (low text density)
                if not text or len(text.strip()) < 50:
                    try:
                        # Only run OCR if image conversion works (requires poppler)
                        # Ensure poppler is installed on the server
                        images = convert_from_path(file_path, first_page=i+1, last_page=i+1)
                        if images:
                            ocr_text = pytesseract.image_to_string(images[0])
                            if ocr_text.strip():
                                text = ocr_text
                    except Exception as ocr_err:
                        # Log but continue (don't fail whole doc for one bad page)
                        print(f"OCR Warning on page {i+1}: {ocr_err}")
                
                # 3. Clean Text
                if text:
                    # Remove multiple newlines but preserve paragraph breaks
                    text = re.sub(r'\n{3,}', '\n\n', text)
                    text = text.replace('\x00', '')
                    
                    documents.append(Document(
                        page_content=text,
                        metadata={"page": i + 1}
                    ))
    except Exception as e:
        raise Exception(f"PDF Parsing Failed: {str(e)}")

    return documents

# --- CUSTOM RETRIEVER ---
class SupabaseRPCRetriever(BaseRetriever):
    supabase: Any
    k: int = 5
    threshold: float = 0.5
    rerank: bool = True

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        try:
            # 1. Initial Retrieval (Fetch more candidates if re-ranking)
            initial_k = self.k * 4 if self.rerank and cross_encoder else self.k
            
            query_vector = embeddings.embed_query(query)
            
            response = self.supabase.rpc(
                "match_documents",
                {
                    "query_embedding": query_vector,
                    "match_threshold": self.threshold,
                    "match_count": initial_k,
                },
            ).execute()

            initial_docs = []
            for record in response.data:
                initial_docs.append(
                    Document(
                        page_content=record["content"],
                        metadata=record["metadata"] or {}
                    )
                )

            # 2. Re-ranking (Cross-Encoder)
            if self.rerank and cross_encoder and initial_docs:
                pairs = [[query, doc.page_content] for doc in initial_docs]
                scores = cross_encoder.predict(pairs)
                
                # Attach score and sort
                scored_docs = sorted(
                    zip(initial_docs, scores), 
                    key=lambda x: x[1], 
                    reverse=True
                )
                
                # Take top K
                final_docs = [doc for doc, score in scored_docs[:self.k]]
                return final_docs
            
            return initial_docs[:self.k]

        except Exception as e:
            print(f"Retrieval Error: {e}")
            return []

# Initialize retriever
retriever = SupabaseRPCRetriever(supabase=supabase, k=5, rerank=True)

# --- RAG CHAIN ---
template = """
You are a Legal Assistant. Answer the question based ONLY on the context below.
If the answer is not in the context, say "I do not have sufficient legal information."
Cite your sources (Document Title, Page). Do NOT use internal chunk IDs.

Context:
{context}

Question:
{question}
"""
prompt = PromptTemplate.from_template(template)

rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# --- CACHING UTILS ---
def get_query_hash(query: str) -> str:
    normalized = query.strip().lower()
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()

async def check_cache(query: str) -> Optional[str]:
    try:
        query_hash = get_query_hash(query)
        response = supabase.table("response_cache").select("response").eq("query_hash", query_hash).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]['response']
    except Exception:
        pass
    return None

async def save_to_cache(query: str, response: str):
    try:
        query_hash = get_query_hash(query)
        supabase.table("response_cache").insert({
            "query_hash": query_hash,
            "query_text": query.strip(),
            "response": response
        }).execute()
    except Exception:
        pass

async def log_interaction(query: str, response: str, role: str, confidence: float, user_id: str):
    try:
        supabase.table("query_logs").insert({
            "user_identifier": user_id,
            "role": role,
            "query_text": query,
            "response_text": response,
            "confidence_score": confidence,
            "escalated": False
        }).execute()
    except Exception:
        pass

# --- ENDPOINTS ---

@app.get("/documents")
async def get_documents():
    response = supabase.table("documents").select("*").order("uploaded_at", desc=True).execute()
    return response.data

@app.get("/documents/{doc_id}/preview")
async def get_document_preview(doc_id: str):
    try:
        response = supabase.table("document_chunks")\
            .select("content")\
            .eq("document_id", doc_id)\
            .limit(10)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete a document and all its associated chunks from Supabase.
    This should be restricted to admins only.
    """
    try:
        # Check if document exists
        check = supabase.table("documents").select("id").eq("id", doc_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Delete from 'documents' table
        # Because we set 'ON DELETE CASCADE' in the SQL schema for 'document_chunks',
        # Supabase/Postgres will automatically delete the related chunks and vectors.
        response = supabase.table("documents").delete().eq("id", doc_id).execute()
        
        if not response.data:
            # Supabase delete returns the deleted rows. If empty, something might be wrong 
            # or it was already deleted, but we checked above.
            # However, sometimes delete returns empty list if no rows match, but we verified existence.
            pass 

        return {"status": "success", "message": "Document deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

@app.get("/admin/logs")
async def get_logs():
    try:
        response = supabase.table("query_logs").select("*").order("created_at", desc=True).limit(50).execute()
        return response.data
    except Exception:
        return []

@app.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    jurisdiction: str = Form(...),
    doc_type: str = Form(...),
    state: Optional[str] = Form(None),
    agency: Optional[str] = Form(None)
):
    if not file.filename.lower().endswith('.pdf'):
         raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are allowed.")

    temp_path = f"temp_{file.filename}"
    
    try:
        # Stage 1: File Upload
        try:
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            log_ingestion_error(file.filename, "file_save", str(e))
            raise HTTPException(status_code=500, detail="Failed to save uploaded file to server.")

        # Stage 2: OCR / Extraction
        try:
            pages = extract_text_from_pdf(temp_path)
            if not pages:
                 raise ValueError("Document appears to be empty or unreadable after OCR attempts.")
        except Exception as e:
            log_ingestion_error(file.filename, "ocr_extraction", str(e))
            raise HTTPException(status_code=422, detail=f"Text extraction failed: {str(e)}")

        # Stage 3: Database Metadata
        try:
            doc_data = {
                "file_name": file.filename,
                "title": title,
                "jurisdiction": jurisdiction,
                "doc_type": doc_type
            }
            # Conditionally add optional fields based on doc_type
            if doc_type in ['Law', 'Regulation'] and state:
                doc_data["state"] = state
            if doc_type == 'Regulation' and agency:
                doc_data["agency"] = agency

            doc_response = supabase.table("documents").insert(doc_data).execute()
            if not doc_response.data:
                 raise Exception("Database returned no data after insert.")
            doc_id = doc_response.data[0]['id']
        except Exception as e:
            log_ingestion_error(file.filename, "db_insert", str(e))
            raise HTTPException(status_code=500, detail="Database Error: Failed to save document metadata.")

        # Stage 4: Chunking
        try:
            for page in pages:
                page.metadata['source_title'] = title
                page.metadata['doc_id'] = doc_id
                page.metadata['doc_type'] = doc_type
                # Embed optional fields in chunks for retrieval filtering
                if doc_type in ['Law', 'Regulation'] and state:
                    page.metadata['state'] = state
                if doc_type == 'Regulation' and agency:
                    page.metadata['agency'] = agency

            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_documents(pages)
        except Exception as e:
            log_ingestion_error(file.filename, "chunking", str(e))
            raise HTTPException(status_code=500, detail="Error splitting document into chunks.")

        # Stage 5: Embeddings
        try:
            vectors = []
            for chunk in chunks:
                vector = embeddings.embed_query(chunk.page_content)
                vectors.append({
                    "document_id": doc_id,
                    "content": chunk.page_content,
                    "metadata": chunk.metadata,
                    "embedding": vector
                })
            
            # Batch insert to Supabase
            batch_size = 50
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                supabase.table("document_chunks").insert(batch).execute()
        except Exception as e:
            log_ingestion_error(file.filename, "embedding", str(e))
            raise HTTPException(status_code=500, detail="AI Service Error: Failed to generate or store embeddings.")

        return {"status": "success", "chunks_processed": len(chunks)}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        log_ingestion_error(file.filename, "unknown", str(e))
        raise HTTPException(status_code=500, detail=f"Unexpected System Error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "unknown"
    role: Optional[str] = "user"

@app.post("/query")
async def query_knowledge_base(request: QueryRequest):
    try:
        # 1. Check Cache
        cached_response = await check_cache(request.query)
        if cached_response:
            await log_interaction(request.query, cached_response, request.role, 1.0, request.user_id)
            return {"answer": cached_response, "source": "cache"}

        # 2. Run RAG
        response = rag_chain.invoke(request.query)
        
        # 3. Save to Cache & Log
        await save_to_cache(request.query, response)
        await log_interaction(request.query, response, request.role, 0.9, request.user_id)

        return {"answer": response, "source": "rag"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while processing the query.")

@app.post("/whatsapp")
async def whatsapp_webhook(From: str = Form(...), Body: str = Form(...)):
    # This endpoint receives the message from Twilio
    try:
        cached = await check_cache(Body)
        if cached:
            response_text = cached
        else:
            response_text = rag_chain.invoke(Body)
            await save_to_cache(Body, response_text)
        
        await log_interaction(Body, response_text, "whatsapp_user", 0.0, From)

    except Exception:
        response_text = "Service is currently unavailable."
    
    # Return TwiML (Twilio Markup XML)
    return Response(content=f"""
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Message>{response_text}</Message>
    </Response>
    """, media_type="application/xml")