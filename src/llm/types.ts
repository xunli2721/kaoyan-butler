/**
 * LLM配置类型
 */
export interface LLMConfig {
  provider: string;
  apiKey?: string;
  model: string;
  baseUrl?: string;
}

/**
 * 聊天消息类型
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM请求类型
 */
export interface LLMRequest {
  messages: ChatMessage[];
  context?: Record<string, any>;
}

/**
 * LLM响应类型
 */
export interface LLMResponse {
  content: string;
  success: boolean;
  timestamp: number;
  error?: string;
}

/**
 * LLM客户端接口
 */
export interface LLMClient {
  isAvailable(): boolean;
  chat(request: LLMRequest): Promise<LLMResponse>;
  simpleChat(message: string): Promise<string>;
}
