// islands/PlanSelection.tsx
import { useState } from "preact/hooks";

interface PlanSelectionProps {
  onSelectPlan: (plan: 'starter' | 'smarter') => void;
}

export default function PlanSelection({ onSelectPlan }: PlanSelectionProps) {
  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div class="max-w-6xl w-full">
        {/* Header */}
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold text-gray-900 mb-3">Choose Your Analytics Experience</h1>
          <p class="text-lg text-gray-600">Select the dashboard that fits your needs</p>
        </div>

        {/* Plans Grid */}
        <div class="grid md:grid-cols-2 gap-8">
          {/* Starter Plan */}
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200 hover:border-blue-300 transition-all">
            <div class="text-center mb-6">
              <div class="inline-block p-3 bg-gray-100 rounded-full mb-4">
                <span class="text-4xl">📊</span>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Starter Dashboard</h2>
              <p class="text-gray-600">Traditional analytics workflow</p>
            </div>

            <ul class="space-y-3 mb-8">
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✓</span>
                <span class="text-gray-700">Manual table selection</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✓</span>
                <span class="text-gray-700">SQL query generation with MotherDuck AI</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✓</span>
                <span class="text-gray-700">Observable Plot visualizations</span>
              </li>
              <li class="flex items-start">
                <span class="text-green-500 mr-2">✓</span>
                <span class="text-gray-700">Step-by-step workflow</span>
              </li>
            </ul>

            <button
              onClick={() => onSelectPlan('starter')}
              class="w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Start with Starter
            </button>
          </div>

          {/* Smarter Plan */}
          <div class="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-500 hover:border-blue-600 transition-all relative">
            <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                ✨ AI-Powered
              </span>
            </div>

            <div class="text-center mb-6">
              <div class="inline-block p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                <span class="text-4xl">🤖</span>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Smarter Dashboard</h2>
              <p class="text-gray-600">AI-powered semantic analytics</p>
            </div>

            <ul class="space-y-3 mb-8">
              <li class="flex items-start">
                <span class="text-blue-500 mr-2">✓</span>
                <span class="text-gray-700">Pre-built sessions & user dashboards</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-500 mr-2">✓</span>
                <span class="text-gray-700">Natural language queries with WebLLM</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-500 mr-2">✓</span>
                <span class="text-gray-700">Automatic chart generation (BSL-style)</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-500 mr-2">✓</span>
                <span class="text-gray-700">Interactive Plotly visualizations</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-500 mr-2">✓</span>
                <span class="text-gray-700">Churn detection & RFM analysis</span>
              </li>
            </ul>

            <button
              onClick={() => onSelectPlan('smarter')}
              class="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Go Smarter with AI
            </button>

            <div class="mt-4 text-center">
              <p class="text-xs text-gray-500">⏱️ Initial setup takes 10-15 seconds</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div class="text-center mt-8 text-sm text-gray-500">
          💡 Both options connect to your MotherDuck database • All processing happens locally
        </div>
      </div>
    </div>
  );
}
