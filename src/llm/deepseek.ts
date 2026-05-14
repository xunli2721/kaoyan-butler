/**
 * DeepSeek API客户端
 */

import { LLMClient, LLMRequest, LLMResponse, LLMConfig } from './types.js';
import { buildChatPrompt } from './prompt.js';

export class DeepSeekClient implements LLMClient {
  private config: LLMConfig;
  private apiKey: string | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.apiKey = this.getApiKey();
  }

  private loadConfig(): LLMConfig {
    return {
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
    };
  }

  private getApiKey(): string | null {
    const envKey = process.env.DEEPSEEK_API_KEY;
    if (envKey) {
      console.log('[DeepSeek] 使用环境变量API Key');
      return envKey;
    }
    if (this.config.apiKey) {
      console.log('[DeepSeek] 使用配置文件API Key');
      return this.config.apiKey;
    }
    console.log('[DeepSeek] API Key未配置');
    return null;
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  async chat(request: LLMRequest, timeoutMs?: number): Promise<LLMResponse> {
    if (!this.apiKey) {
      return {
        content: 'DeepSeek API Key未配置，请设置环境变量DEEPSEEK_API_KEY',
        success: false,
        timestamp: Date.now(),
        error: 'API Key未配置',
      };
    }

    try {
      const prompt = buildChatPrompt(
        request.messages[request.messages.length - 1].content,
        request.context
      );

      const response = await this.callDeepSeekAPI(prompt, timeoutMs);

      return {
        content: response,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('[DeepSeek] 调用失败:', error);
      return {
        content: `抱歉，DeepSeek服务出现错误: ${error.message}`,
        success: false,
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }

  async simpleChat(message: string, memoryContext?: string, timeoutMs?: number): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: message }],
      context: memoryContext ? { memoryContext } : undefined,
    }, timeoutMs);
    return response.content;
  }

  /**
   * 多模态对话：支持图片+文本
   */
  async imageChat(message: string, imageBase64: string, memoryContext?: string): Promise<string> {
    if (!this.apiKey) {
      return 'DeepSeek API Key未配置，请设置环境变量DEEPSEEK_API_KEY';
    }

    const contextPrefix = memoryContext ? `【记忆上下文】\n${memoryContext}\n\n` : '';
    const fullPrompt = `${contextPrefix}${message}`;

    const content: any[] = [
      { type: 'text', text: fullPrompt },
      { type: 'image_url', image_url: { url: imageBase64 } },
    ];

    try {
      const response = await this.callMultimodalAPI(content);
      return response;
    } catch (error: any) {
      console.error('[DeepSeek] 图片识别失败:', error);
      return '图片识别暂不可用：DeepSeek API 目前不支持图片识别功能。请直接用文字描述题目内容，我可以帮你解答。';
    }
  }

  private async callMultimodalAPI(content: any[]): Promise<string> {
    const url = 'https://api.deepseek.com/v1/chat/completions';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'deepseek-v4-flash',
          messages: [{ role: 'user', content }],
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callDeepSeekAPI(prompt: string, timeoutMs?: number): Promise<string> {
    const url = 'https://api.deepseek.com/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'deepseek-v4-flash',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createDeepSeekClient(): DeepSeekClient {
  return new DeepSeekClient();
}
