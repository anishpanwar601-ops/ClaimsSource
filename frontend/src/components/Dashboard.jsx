import React, { useState } from 'react';
import { Plus, Download, FileText, CheckCircle, XCircle, AlertTriangle, Eye, Search, Filter } from 'lucide-react';

export default function Dashboard({ claims, onStartNewClaim, onSelectClaim, onLogout, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Stats Calculations
  const totalClaims = claims.length;
  const approvedClaims = claims.filter(c => c.status === 'Approved' || c.aiRecommendation === 'Approve' && c.status !== 'Rejected').length;
  const pendingClaims = claims.filter(c => c.status === 'Pending Review').length;
  const npaClaimsCount = claims.filter(c => c.npaStatus).length;
  const npaPercentage = totalClaims > 0 ? Math.round((npaClaimsCount / totalClaims) * 100) : 0;

  // Filter & Search Logic
  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.accountNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Pending' && c.status === 'Pending Review') ||
      (statusFilter === 'Approved' && c.status === 'Approved') ||
      (statusFilter === 'Rejected' && c.status === 'Rejected');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900 text-white shadow-md py-4 px-6 sm:px-8 flex justify-between items-center relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ClaimSphere</h1>
            <p className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase">AI Audit System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.name || 'Administrator'}</p>
            <p className="text-xs text-slate-400">{user?.role || 'Admin User'}</p>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:border-slate-600 transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Welcome Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Claims Overview</h2>
            <p className="text-slate-500 text-sm mt-1">
              Process new asset recovery claims, analyze NPA classification, and download formal letters.
            </p>
          </div>
          <button 
            onClick={onStartNewClaim}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Evaluate New Claim
          </button>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Claims</p>
              <h3 className="text-3xl font-black text-slate-900 mt-2">{totalClaims}</h3>
              <p className="text-xs text-slate-500 mt-1">All processed records</p>
            </div>
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved / Rec</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">{approvedClaims}</h3>
              <p className="text-xs text-slate-500 mt-1">Ready or finalized</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Under Review</p>
              <h3 className="text-3xl font-black text-amber-600 mt-2">{pendingClaims}</h3>
              <p className="text-xs text-slate-500 mt-1">Awaiting compliance audit</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">NPA Percentage</p>
              <h3 className="text-3xl font-black text-red-600 mt-2">{npaPercentage}%</h3>
              <p className="text-xs text-slate-500 mt-1">DPD overdue &gt; 90 days</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, Borrower name or Loan number..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Claims Table/List Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-slate-900">Claim Database</h4>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
              Showing {filteredClaims.length} of {claims.length} claims
            </span>
          </div>

          <div className="overflow-x-auto">
            {filteredClaims.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-extrabold uppercase border-b border-slate-100">
                    <th className="py-4 px-6">Claim ID</th>
                    <th className="py-4 px-6">Borrower / Account</th>
                    <th className="py-4 px-6">Outstanding / Loan</th>
                    <th className="py-4 px-6">Overdue (DPD)</th>
                    <th className="py-4 px-6">NPA Classification</th>
                    <th className="py-4 px-6 text-center">AI Recommendation</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/70 transition-all">
                      <td className="py-4 px-6 font-bold text-slate-900">{claim.id}</td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{claim.borrowerName}</div>
                        <div className="text-xs text-slate-500">{claim.accountNumber}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">${claim.outstandingAmount.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">of ${claim.loanAmount.toLocaleString()}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          claim.dpd > 90 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {claim.dpd} Days
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700">
                        {claim.npaStatus ? (
                          <div className="flex items-center gap-1.5 text-red-600">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            <span>{claim.npaCategory}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Standard</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          claim.aiRecommendation === 'Approve' ? 'bg-emerald-100 text-emerald-800' :
                          claim.aiRecommendation === 'Reject' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {claim.aiRecommendation}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectClaim(claim, 'template')}
                            className="p-2 hover:bg-sky-50 text-sky-600 hover:text-sky-700 rounded-lg transition-all cursor-pointer"
                            title="Edit Claim Template"
                          >
                            <FileText className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => onSelectClaim(claim, 'pdf')}
                            className="p-2 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg transition-all cursor-pointer"
                            title="Generate Letter PDF"
                          >
                            <Download className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => onSelectClaim(claim, 'view')}
                            className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-semibold text-slate-600">No claims found</p>
                <p className="text-xs text-slate-400 mt-1">Try altering your search text or status filter.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
