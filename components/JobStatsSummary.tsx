'use client';

import React from 'react';
import { CrawlJobStatus, UrlStatus, UrlDetails } from '@/lib/types';
import { Globe, BookOpen, HardDrive, AlertTriangle } from 'lucide-react';

// Helper function to count URLs by status (using UrlDetails)
const countUrlsByStatus = (urls: Record<string, UrlDetails> | undefined, targetStatus: UrlStatus | UrlStatus[]): number => {
  if (!urls) return 0;
  const targetStatuses = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
  return Object.values(urls).filter(details => targetStatuses.includes(details.status)).length;
};

interface JobStatsSummaryProps {
  jobStatus: CrawlJobStatus | null;
}

const JobStatsSummary: React.FC<JobStatsSummaryProps> = ({ jobStatus }) => {
  // Calculate stats based on jobStatus
  const subdomainsParsed = jobStatus?.urls ? Object.keys(jobStatus.urls).length : 0;
  const pagesCrawled = countUrlsByStatus(jobStatus?.urls, 'completed');
  const errorsEncountered = countUrlsByStatus(jobStatus?.urls, ['discovery_error', 'crawl_error']);
  const dataExtracted = jobStatus?.data_extracted ?? 'N/A';
  const isProcessing = jobStatus ? !['completed', 'completed_with_errors', 'error', 'discovery_complete'].includes(jobStatus.overall_status) : false;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      {/* Subdomains Parsed */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <Globe className="mx-auto h-6 w-6 text-blue-400 mb-2" />
        <p className="text-xs text-gray-400 uppercase">URLs Discovered</p>
        <p className={`text-2xl font-bold ${isProcessing ? 'text-gray-400 animate-pulse' : 'text-blue-300'}`}>
          {subdomainsParsed}
        </p>
      </div>

      {/* Pages Crawled */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <BookOpen className="mx-auto h-6 w-6 text-green-400 mb-2" />
        <p className="text-xs text-gray-400 uppercase">Pages Crawled</p>
        <p className={`text-2xl font-bold ${isProcessing ? 'text-gray-400 animate-pulse' : 'text-green-300'}`}>
          {pagesCrawled}
        </p>
      </div>

      {/* Data Extracted */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <HardDrive className="mx-auto h-6 w-6 text-yellow-400 mb-2" />
        <p className="text-xs text-gray-400 uppercase">Data Extracted</p>
        <p className={`text-2xl font-bold ${isProcessing ? 'text-gray-400 animate-pulse' : 'text-yellow-300'}`}>
          {dataExtracted}
        </p>
      </div>

      {/* Errors Encountered */}
      <div className="bg-gray-700/50 p-4 rounded-lg">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-400 mb-2" />
        <p className="text-xs text-gray-400 uppercase">Errors</p>
        <p className={`text-2xl font-bold ${errorsEncountered > 0 ? 'text-red-400' : (isProcessing ? 'text-gray-400 animate-pulse' : 'text-red-300')}`}>
          {errorsEncountered}
        </p>
      </div>
    </div>
  );
};

export default JobStatsSummary;