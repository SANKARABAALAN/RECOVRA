import { supabase } from "../lib/supabase";

export interface ConversationMessage {
  id?: string;
  recovery_case_id: string;
  role: string;
  message: string;
  detected_intent: string | null;
  confidence_score: number | null;
  created_at?: string;
}

export const conversationService = {
  async getConversationsByCase(caseId: string): Promise<ConversationMessage[]> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("recovery_case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  },

  async createMessage(
    message: Omit<ConversationMessage, "id" | "created_at">
  ): Promise<ConversationMessage> {
    const { data, error } = await supabase
      .from("conversations")
      .insert(message)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },
};
