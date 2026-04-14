// ============================================================
// EnterpriseCRM — NdaModal
// Phase H: NDA overlay modal shown on first visit
// Logo is ONLY shown here, never on app screens
// ============================================================

import React, { useState, useEffect } from 'react';

const NDA_KEY = 'nda_accepted';

const NDA_TEXT = [
  'Vítejte v interaktivním prototypu projektu EnterpriseCRM.',
  'Z důvodu NDA jsou data anonymizována.',
  'Využijte přepínač v pravém horním rohu a vyzkoušet si celý průchod aplikací pod různými uživatelskými rolemi.',
];

const NdaModal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(NDA_KEY);
    if (accepted !== 'true') {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(NDA_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-8 flex flex-col items-center gap-6">
        {/* Logo — shown ONLY in NDA modal */}
        <img
          src="/logo.svg"
          alt="EnterpriseCRM Logo"
          className="max-w-[200px] h-auto"
        />

        <h1 className="text-2xl font-bold text-gray-900">EnterpriseCRM</h1>

        <div className="text-center text-gray-600 leading-relaxed space-y-2">
          {NDA_TEXT.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <button
          onClick={handleAccept}
          className="mt-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Spustit prototyp
        </button>
      </div>
    </div>
  );
};

export default NdaModal;
