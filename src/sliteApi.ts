import axios, { AxiosInstance } from "axios";

export interface SliteNote {
  id: string;
  title: string;
  markdown?: string;
  parentNoteId?: string;
  attributes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SliteSearchResult {
  id: string;
  title: string;
  snippet?: string;
  type: string;
}

export class SliteApiClient {
  private api: AxiosInstance;

  constructor(apiKey: string) {
    this.api = axios.create({
      baseURL: "https://api.slite.com/v1",
      headers: {
        "x-slite-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
  }

  /**
   * Get a specific note by ID
   */
  async getNote(noteId: string, format: 'md' | 'html' = 'md'): Promise<SliteNote> {
    try {
      const response = await this.api.get(`/notes/${noteId}?format=${format}`);
      return response.data;
    } catch (error: unknown) {
      console.error(`Error fetching note ${noteId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch note ${noteId}: ${errorMessage}`);
    }
  }

  /**
   * Create a new note
   */
  async createNote(
    title: string, 
    markdown: string, 
    parentNoteId?: string, 
    templateId?: string,
    attributes?: string[]
  ): Promise<SliteNote> {
    try {
      const payload: Record<string, any> = {
        title,
        markdown
      };
      
      if (parentNoteId) payload.parentNoteId = parentNoteId;
      if (templateId) payload.templateId = templateId;
      if (attributes && attributes.length > 0) payload.attributes = attributes;
      
      const response = await this.api.post("/notes", payload);
      return response.data;
    } catch (error: unknown) {
      console.error("Error creating note:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create note: ${errorMessage}`);
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(
    noteId: string, 
    updates: { 
      title?: string; 
      markdown?: string;
      parentNoteId?: string;
      attributes?: string[];
    }
  ): Promise<SliteNote> {
    try {
      const response = await this.api.put(`/notes/${noteId}`, updates);
      return response.data;
    } catch (error: unknown) {
      console.error(`Error updating note ${noteId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update note ${noteId}: ${errorMessage}`);
    }
  }

  /**
   * Search notes
   */
  async searchNotes(query: string, limit: number = 10): Promise<SliteSearchResult[]> {
    try {
      const response = await this.api.get('/search-notes', {
        params: { q: query, limit }
      });
      return response.data.results || [];
    } catch (error: unknown) {
      console.error(`Error searching for "${query}":`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to search for "${query}": ${errorMessage}`);
    }
  }

  /**
   * Get Slite Ask information
   */
  async getAskInfo(): Promise<any> {
    try {
      const response = await this.api.get('/ask');
      return response.data;
    } catch (error: unknown) {
      console.error("Error fetching Ask info:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Ask info: ${errorMessage}`);
    }
  }

  /**
   * Get Slite Ask index information
   */
  async getAskIndex(): Promise<any> {
    try {
      const response = await this.api.get('/ask/index');
      return response.data;
    } catch (error: unknown) {
      console.error("Error fetching Ask index:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch Ask index: ${errorMessage}`);
    }
  }

  /**
   * Get automation assistant information
   */
  async getAutomationAssistant(assistantId: string): Promise<any> {
    try {
      const response = await this.api.get(`/super/automation/${assistantId}`);
      return response.data;
    } catch (error: unknown) {
      console.error(`Error fetching automation assistant ${assistantId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch automation assistant ${assistantId}: ${errorMessage}`);
    }
  }
}
