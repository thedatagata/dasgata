import { useEffect, useState } from "preact/hooks";
import { CreateMLCEngine } from "@mlc-ai/web-llm";

export default function WebLLMLoader() {
  const [status, setStatus] = useState("Setting up your premium environment...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadWebLLM() {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatus("Fetching AI model configuration...");
        setProgress(10);
        
        const configResponse = await fetch('/api/ld-config');
        const config = await configResponse.json();
        
        const modelId = config.model || "Llama-3.1-8B-Instruct-q4f32_1-MLC";
        setStatus(`Initializing ${modelId}...`);
        setProgress(20);
        
        const engine = await CreateMLCEngine(modelId, {
          initProgressCallback: (report) => {
            setStatus(report.text);
            setProgress(20 + (report.progress * 80));
          }
        });
        
        (globalThis as any).webllmEngine = engine;
        
        setStatus("Ready! Redirecting to dashboard...");
        setProgress(100);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        globalThis.location.href = "/app/dashboard";
      } catch (error) {
        console.error("WebLLM error:", error);
        setStatus("Error loading premium features. Redirecting...");
        setTimeout(() => globalThis.location.href = "/app/dashboard", 2000);
      }
    }
    
    loadWebLLM();
  }, []);

  return (
    <div class="min-h-screen bg-gradient-to-br from-[#172217] to-[#186018] flex items-center justify-center p-8">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#90C137] mb-6"></div>
          <h1 class="text-4xl font-bold text-[#F8F6F0] mb-4">
            Premium Setup
          </h1>
          <p class="text-[#F8F6F0]/80 text-lg">{status}</p>
        </div>
        
        <div class="w-full h-4 bg-[#172217] rounded-full overflow-hidden">
          <div 
            class="h-full bg-[#90C137] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div class="text-center text-[#F8F6F0]/60 text-sm">
          {Math.round(progress)}%
        </div>
        
        <p class="text-center text-[#F8F6F0]/50 text-xs">
          This may take a minute so sit back and have a sip of some of that swamp water...
        </p>
      </div>
    </div>
  );
}