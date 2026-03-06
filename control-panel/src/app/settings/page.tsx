"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TemplateEditorTab from "@/components/TemplateEditorTab";
import FleetConfigTab from "@/components/FleetConfigTab";
import AgentConfigTab from "@/components/AgentConfigTab";
import ProxySettingsTab from "@/components/ProxySettingsTab";

const tabs = [
  {
    id: "template",
    label: "Template",
    description: "Config for new agents",
  },
  {
    id: "fleet",
    label: "Fleet Config",
    description: "Push to all agents",
  },
  {
    id: "agent",
    label: "Per-Agent",
    description: "Edit & test one agent",
  },
  {
    id: "proxy",
    label: "Proxy",
    description: "Agent proxy & privacy",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("fleet");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:ml-56 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <div className="mb-6">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Manage configuration, templates, and proxy settings across the fleet
          </p>
        </div>

        <div
          className="flex gap-1 p-1 rounded-lg mb-6 overflow-x-auto no-scrollbar"
          style={{ background: "var(--bg-secondary)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-[72px] sm:min-w-[100px] px-2 sm:px-4 py-2.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium cursor-pointer transition-colors"
              style={{
                background:
                  activeTab === tab.id ? "var(--bg-card)" : "transparent",
                color:
                  activeTab === tab.id
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                boxShadow:
                  activeTab === tab.id
                    ? "0 1px 3px rgba(0,0,0,0.2)"
                    : "none",
              }}
            >
              <div className="whitespace-nowrap">{tab.label}</div>
              <div
                className="text-xs mt-0.5 hidden sm:block"
                style={{
                  color:
                    activeTab === tab.id
                      ? "var(--text-secondary)"
                      : "var(--text-muted)",
                }}
              >
                {tab.description}
              </div>
            </button>
          ))}
        </div>

        {activeTab === "template" && <TemplateEditorTab />}
        {activeTab === "fleet" && <FleetConfigTab />}
        {activeTab === "agent" && <AgentConfigTab />}
        {activeTab === "proxy" && <ProxySettingsTab />}
      </main>
    </div>
  );
}
