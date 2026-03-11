import React, { useState, useEffect } from 'react';
import { Sidebar, Navbar } from '../components/index';
import { reportAPI } from '../services/api';
import { TrendingUp, Users, Landmark, DollarSign, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data } = await reportAPI.getDashboardStats();
      setStats(data.stats);
      setMonthlyData(data.monthlyCollection);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Navbar />
        <div className="pt-20 p-6 bg-gray-50 min-h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded mb-6 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">Loading dashboard...</div>
          ) : stats ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Loans</p>
                      <p className="text-3xl font-bold text-gray-800">
                        {stats.activeLoans + stats.closedLoans}
                      </p>
                    </div>
                    <TrendingUp size={32} className="text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Active Loans</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.activeLoans}</p>
                    </div>
                    <TrendingUp size={32} className="text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Borrowers</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalBorrowers}</p>
                    </div>
                    <Users size={32} className="text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Lenders</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalLenders}</p>
                    </div>
                    <Landmark size={32} className="text-orange-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Loan Portfolio</p>
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{(stats.totalLoanAmount / 100000).toFixed(1)}L
                      </p>
                    </div>
                    <DollarSign size={32} className="text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Interest Collected</p>
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{(stats.collectedInterest / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <DollarSign size={32} className="text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-2 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Pending Interest</p>
                      <p className="text-2xl font-bold text-orange-600">
                        ₹{(stats.pendingInterest / 1000).toFixed(1)}K
                      </p>
                    </div>
                    <AlertCircle size={32} className="text-orange-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Closed Loans</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.closedLoans}</p>
                    </div>
                    <TrendingUp size={32} className="text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Monthly Collection Chart */}
              {monthlyData && monthlyData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Interest Collection</h2>
                  <div className="flex items-end gap-2 h-40">
                    {monthlyData.map((entry, idx) => {
                      const maxAmount = Math.max(...monthlyData.map((d) => d.amount || 0));
                      const height = (entry.amount / maxAmount) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                          <div
                            className="bg-blue-600 rounded-t w-full"
                            style={{ height: `${height}%` }}
                          ></div>
                          <p className="text-xs text-gray-600 mt-2">{entry._id}</p>
                          <p className="text-xs font-semibold">
                            ₹{(entry.amount / 1000).toFixed(0)}K
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
