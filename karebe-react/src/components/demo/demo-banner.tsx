/**
 * Demo Banner Component
 * Shows demo credentials and demo mode indicator
 */

import { useState } from 'react';
import { AlertTriangle, X, Info, Copy, Check } from 'lucide-react';

const demoCredentials = [
  { role: 'Super Admin', email: 'owner@karebe.com', password: 'owner123' },
  { role: 'Admin', email: 'admin@karebe.com', password: 'admin123' },
  { role: 'Rider', email: 'rider@karebe.com', password: 'rider123' },
  { role: 'Customer', email: 'customer@karebe.com', password: 'customer123' },
];

export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Only show in development
  if (import.meta.env.PROD || !isVisible) {
    return null;
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800 font-medium">
                Demo Mode - No backend connected
              </span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-amber-700 hover:text-amber-900 underline ml-2"
              >
                {showDetails ? 'Hide credentials' : 'Show credentials'}
              </button>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-amber-600 hover:text-amber-800"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {showDetails && (
            <div className="mt-3 pb-2">
              <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Demo Login Credentials
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {demoCredentials.map((cred) => (
                    <div
                      key={cred.email}
                      className="bg-gray-50 rounded p-3 text-sm"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {cred.role}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs text-gray-600 bg-white px-1.5 py-0.5 rounded border">
                            {cred.email}
                          </code>
                          <button
                            onClick={() => handleCopy(cred.email, `${cred.role}-email`)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy email"
                          >
                            {copied === `${cred.role}-email` ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs text-gray-600 bg-white px-1.5 py-0.5 rounded border">
                            {cred.password}
                          </code>
                          <button
                            onClick={() => handleCopy(cred.password, `${cred.role}-password`)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy password"
                          >
                            {copied === `${cred.role}-password` ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  All data is stored locally in your browser. Changes will be lost on page refresh.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DemoCredentialsCard() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-900">
          Demo Credentials
        </span>
      </div>
      
      <div className="space-y-2">
        {demoCredentials.slice(0, 2).map((cred) => (
          <div key={cred.email} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{cred.role}:</span>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white px-2 py-1 rounded border border-amber-200">
                {cred.email} / {cred.password}
              </code>
              <button
                onClick={() => handleCopy(`${cred.email} / ${cred.password}`, cred.role)}
                className="text-amber-600 hover:text-amber-800"
              >
                {copied === cred.role ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}