import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Nachricht Frontend
        </h1>
        <p className="text-gray-600 mb-4">
          메시징 앱이 정상적으로 실행되고 있습니다!
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">✅ React + TypeScript</p>
          <p className="text-sm text-gray-500">✅ Vite 개발 서버</p>
          <p className="text-sm text-gray-500">✅ TailwindCSS</p>
        </div>
      </div>
    </div>
  );
};

export default TestApp;
