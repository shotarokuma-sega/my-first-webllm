import type { AppConfig, ModelRecord } from "@mlc-ai/web-llm";

export type LocalModelDefinition = {
  id: string;
  label: string;
  repository: string;
  wasmUrl: string;
  vramRequiredMB: number;
  requiredFeatures?: string[];
};

export const LOCAL_MODELS: LocalModelDefinition[] = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 1.5B（軽量）",
    repository: "mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    wasmUrl:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
    vramRequiredMB: 1629.75,
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 3B（標準）",
    repository: "mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC",
    wasmUrl:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2.5-3B-Instruct-q4f16_1_cs1k-webgpu.wasm",
    vramRequiredMB: 2504.76,
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    label: "Qwen 3 4B（高品質）",
    repository: "mlc-ai/Qwen3-4B-q4f16_1-MLC",
    wasmUrl:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen3-4B-q4f16_1_cs1k-webgpu.wasm",
    vramRequiredMB: 3431.59,
  },
];

export function createLocalAppConfig(): AppConfig {
  const baseUrl = new URL(
    `${import.meta.env.BASE_URL}models-v3/`,
    window.location.origin,
  );
  const modelList: ModelRecord[] = LOCAL_MODELS.map((model) => ({
    model_id: model.id,
    model: new URL(`${model.id}/resolve/main/`, baseUrl).href,
    model_lib: new URL(`${model.id}/model.wasm`, baseUrl).href,
    vram_required_MB: model.vramRequiredMB,
    low_resource_required: true,
    required_features: model.requiredFeatures,
    overrides: { context_window_size: 4096 },
  }));

  return {
    model_list: modelList,
    cacheBackend: "indexeddb",
  };
}
