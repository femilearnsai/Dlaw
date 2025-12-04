import React from 'react';
import { MOCK_LOGS } from '../Services/mockdata';
import { MessageSquare, User, ShieldAlert } from 'lucide-react';

export const Logs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Audit Logs</h2>
        <p className="text-slate-500">Monitor interaction history, confidence scores, and escalations.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Query Summary</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {MOCK_LOGS.map((log) => (
                    <tr key={log.conversation_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-900 capitalize">{log.role}</span>
                            </div>
                            <div className="text-xs text-slate-400 ml-6">{log.user_phone}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-start gap-2 max-w-md">
                                <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-700 truncate">{log.query_summary}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${log.confidence > 0.7 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        style={{ width: `${log.confidence * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs font-bold text-slate-600">{(log.confidence * 100).toFixed(0)}%</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            {log.escalated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                    <ShieldAlert size={12} />
                                    Escalated
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    Resolved
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};