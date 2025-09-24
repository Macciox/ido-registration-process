import React from 'react';

interface LegalAnalysisResultsProps {
  results: any[];
  summary: {
    overall_score: number;
    found_items: number;
    clarification_items: number;
    missing_items: number;
  };
  templateName: string;
}

const LegalAnalysisResults: React.FC<LegalAnalysisResultsProps> = ({
  results,
  summary,
  templateName
}) => {
  const totalRiskScore = summary.overall_score;
  const maxPossibleScore = results.length * 1000;
  const riskPercentage = Math.round((totalRiskScore / maxPossibleScore) * 100);

  // Risk level classification
  const getRiskLevel = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 70) return { level: 'High Risk', color: 'text-red-600 bg-red-50' };
    if (percentage >= 30) return { level: 'Medium Risk', color: 'text-yellow-600 bg-yellow-50' };
    return { level: 'Low Risk', color: 'text-green-600 bg-green-50' };
  };

  const riskLevel = getRiskLevel(totalRiskScore, maxPossibleScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          📋 Template: {templateName}
        </h2>
        
        {/* Risk Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className={`p-4 rounded-lg ${riskLevel.color}`}>
            <div className="text-2xl font-bold">{totalRiskScore}/{maxPossibleScore}</div>
            <div className="text-sm">Total Risk Score</div>
            <div className="text-xs mt-1">{riskLevel.level}</div>
          </div>
          
          <div className="p-4 rounded-lg bg-blue-50 text-blue-600">
            <div className="text-2xl font-bold">{riskPercentage}%</div>
            <div className="text-sm">Risk Percentage</div>
            <div className="text-xs mt-1">Lower is Better</div>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 text-gray-600">
            <div className="text-2xl font-bold">{results.length}</div>
            <div className="text-sm">Total Questions</div>
            <div className="text-xs mt-1">MiCA Compliance</div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Analysis Results</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selected Answer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reasoning & Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => {
                const riskScore = result.coverage_score || 0;
                const riskColor = riskScore >= 1000 ? 'text-red-600' : 
                                 riskScore > 0 ? 'text-yellow-600' : 'text-green-600';
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.item_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {result.category}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${riskColor}`}>
                      {riskScore}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        result.selected_answer === 'Yes' ? 'bg-red-100 text-red-800' :
                        result.selected_answer === 'No' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.selected_answer || 'N/A'}
                      </span>
                      {result.scoring_logic && (
                        <div className="text-xs text-gray-400 mt-1">
                          {result.scoring_logic}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="truncate" title={result.reasoning}>
                        {result.reasoning}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {result.evidence && result.evidence.length > 0 ? (
                        <button className="text-blue-600 hover:text-blue-800">
                          View ({result.evidence.length})
                        </button>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          📊 Risk Score Explanation
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Risk Score:</strong> Higher scores indicate higher regulatory risk</p>
          <p><strong>0 points:</strong> Low risk - compliant or no regulatory concerns</p>
          <p><strong>1-999 points:</strong> Medium risk - requires attention or clarification</p>
          <p><strong>1000+ points:</strong> High risk - significant regulatory concerns</p>
          <p><strong>Total Score:</strong> {totalRiskScore}/{maxPossibleScore} ({riskPercentage}% risk level)</p>
        </div>
      </div>
    </div>
  );
};

export default LegalAnalysisResults;