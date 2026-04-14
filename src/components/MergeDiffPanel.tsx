import React from 'react';

interface MergeDiffPanelProps {
  myChanges: Record<string, any>;
  theirChanges: Record<string, any>;
  onAcceptMine: () => void;
  onAcceptTheirs: () => void;
  fieldLabels?: Record<string, string>;
}

const MergeDiffPanel: React.FC<MergeDiffPanelProps> = ({
  myChanges,
  theirChanges,
  onAcceptMine,
  onAcceptTheirs,
  fieldLabels = {},
}) => {
  const allKeys = Array.from(new Set([...Object.keys(myChanges), ...Object.keys(theirChanges)]));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 bg-gray-100 border-b border-gray-200">
        <div className="px-4 py-2 text-sm font-semibold text-gray-700">Moje změny</div>
        <div className="px-4 py-2 text-sm font-semibold text-gray-700">Jejich změny</div>
      </div>

      <div className="divide-y divide-gray-100">
        {allKeys.map((key) => {
          const myVal = myChanges[key];
          const theirVal = theirChanges[key];
          const isDifferent = JSON.stringify(myVal) !== JSON.stringify(theirVal);
          const label = fieldLabels[key] ?? key;

          return (
            <div key={key}>
              <div className="px-4 pt-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {label}
              </div>
              <div className="grid grid-cols-2">
                <div
                  className={`px-4 py-2 text-sm ${
                    isDifferent ? 'bg-green-50 text-green-900' : 'text-gray-700'
                  }`}
                >
                  {myVal !== undefined ? String(myVal) : <span className="text-gray-400 italic">—</span>}
                </div>
                <div
                  className={`px-4 py-2 text-sm ${
                    isDifferent ? 'bg-red-50 text-red-900' : 'text-gray-700'
                  }`}
                >
                  {theirVal !== undefined ? String(theirVal) : <span className="text-gray-400 italic">—</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
        <button
          onClick={onAcceptTheirs}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          Přijmout jejich
        </button>
        <button
          onClick={onAcceptMine}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Přijmout moje
        </button>
      </div>
    </div>
  );
};

export default MergeDiffPanel;
