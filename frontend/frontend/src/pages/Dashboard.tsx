import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { CHART_DATA, INITIAL_DOCS } from '../Services/mockdata';
import { Users, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      <p className={`text-xs mt-1 font-medium ${sub.includes('+') ? 'text-emerald-600' : 'text-slate-400'}`}>
        {sub}
      </p>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const docsIndexed = INITIAL_DOCS.filter(d => d.status === 'indexed').length;
  const escalationRate = "8.4%";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Overview</h2>
        <p className="text-slate-500">Real-time metrics for LexAssist RAG Pipeline.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Documents" 
          value={INITIAL_DOCS.length} 
          sub={`${docsIndexed} indexed`}
          icon={FileText} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Queries Today" 
          value="142" 
          sub="+12% from yesterday"
          icon={Users} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Escalation Rate" 
          value={escalationRate} 
          sub="Within acceptable limits"
          icon={AlertTriangle} 
          color="bg-amber-500"
        />
        <StatCard 
          title="Avg. Confidence" 
          value="87%" 
          sub="Top K=8 Retrieval"
          icon={CheckCircle} 
          color="bg-indigo-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Query Volume (7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="queries" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Retrieval Confidence Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="confidence" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Alerts/Action Items */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">System Notices</h3>
        </div>
        <div className="p-6 space-y-4">
             <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-sm font-bold text-amber-900">Low Confidence Cluster Detected</h4>
                    <p className="text-sm text-amber-800 mt-1">Queries regarding "Tax Tribunal Appeals" are returning confidence scores below 60%. Consider uploading relevant case law.</p>
                </div>
             </div>
        </div>
      </div>

    </div>
  );
};