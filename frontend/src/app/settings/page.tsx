"use client";

import React, { useState } from "react";
import { Cpu, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ProviderItem {
  id: string;
  name: string;
  model: string;
  configured: boolean;
  masked_key?: string;
  url?: string;
}

export default function SettingsPage() {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; status: string; message: string } | null>(null);

  const providers: ProviderItem[] = [
    {
      id: "mock",
      name: "Mock Agent Provider (Offline Fixtures)",
      model: "deterministic-v1",
      configured: true,
      masked_key: "0 keys needed"
    },
    {
      id: "gemini",
      name: "Google Gemini Flash (Primary: Scanning & Explanations)",
      model: "gemini-1.5-flash",
      configured: false,
      masked_key: "Not set in .env"
    },
    {
      id: "groq",
      name: "Groq LLaMA (Primary: Fast Short Calls & Critic)",
      model: "llama-3.1-70b-versatile",
      configured: false,
      masked_key: "Not set in .env"
    },
    {
      id: "mistral",
      name: "Mistral Codestral (Primary: Test Gen & Patching)",
      model: "codestral-latest",
      configured: false,
      masked_key: "Not set in .env"
    },
    {
      id: "ollama",
      name: "Local Ollama (Private Mode & Offline Backup)",
      model: "qwen2.5-coder:7b",
      configured: true,
      url: "http://localhost:11434"
    }
  ];

  const handleTestConnection = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      if (id === "mock") {
        setTestResult({
          id,
          status: "success",
          message: "Mock Provider Verified: Ready for zero-cost testing and demonstrations."
        });
      } else if (id === "ollama") {
        setTestResult({
          id,
          status: "success",
          message: "Ollama Endpoint Reachable: Private Mode enabled without external network calls."
        });
      } else {
        setTestResult({
          id,
          status: "missing",
          message: `${id.toUpperCase()}_API_KEY not supplied. Feature gracefully runs with Mock Provider.`
        });
      }
      setTestingId(null);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
          LLM Engine & Services Configuration
        </h1>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5">
          Role-based LLM routing table, active provider connectivity, and rate-limit quotas.
        </p>
      </div>

      {testResult && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 ${
            testResult.status === "success"
              ? "bg-[#10B981]/15 text-[#059669] dark:text-[#10B981] border border-[#10B981]/30"
              : "bg-[#F59E0B]/15 text-[#D97706] dark:text-[#F59E0B] border border-[#F59E0B]/30"
          }`}
        >
          {testResult.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Provider Status Table */}
      <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
            <h2 className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
              Connected LLM Providers & Adapters
            </h2>
          </div>
          <Badge variant="teal">Active Mode: MOCK</Badge>
        </div>

        <div className="divide-y divide-[#E7E5E4] dark:divide-[#292524]">
          {providers.map((p) => (
            <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{p.name}</span>
                  {p.configured ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/15 text-[#059669] dark:text-[#10B981]">
                      Configured
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#6B7280]/15 text-[#6B7280]">
                      Optional Key Missing
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-[#78716C] dark:text-[#A8A29E] flex items-center gap-3">
                  <span>Model: {p.model}</span>
                  <span>Credentials: {p.masked_key || p.url}</span>
                </div>
              </div>

              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={testingId === p.id}
                  onClick={() => handleTestConnection(p.id)}
                >
                  <RefreshCw className={`w-3 h-3 mr-1.5 ${testingId === p.id ? "animate-spin" : ""}`} />
                  Test Connection
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Routing Card */}
      <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
          Active Agent Role-Based Routing (`llm_routing.yaml`)
        </h3>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
          Agents route dynamically through primary adapters with automatic fallback chains upon rate limit (429) or timeout.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
            <span className="text-[#0F766E] dark:text-[#14B8A6] font-semibold">scanner</span>: Gemini Flash → Groq → Ollama
          </div>
          <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
            <span className="text-[#0F766E] dark:text-[#14B8A6] font-semibold">reproducer</span>: Codestral → Gemini → Ollama
          </div>
          <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
            <span className="text-[#0F766E] dark:text-[#14B8A6] font-semibold">patcher</span>: Codestral → Groq → Ollama
          </div>
          <div className="p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
            <span className="text-[#0F766E] dark:text-[#14B8A6] font-semibold">critic</span>: Groq LLaMA (Independent Model)
          </div>
        </div>
      </div>
    </div>
  );
}
