export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      controle_pj: {
        Row: {
          cnpj: string | null
          id: number
          nome: string
          nome_vendas: string | null
          setor: string | null
          unidade: string | null
        }
        Insert: {
          cnpj?: string | null
          id?: number
          nome: string
          nome_vendas?: string | null
          setor?: string | null
          unidade?: string | null
        }
        Update: {
          cnpj?: string | null
          id?: number
          nome?: string
          nome_vendas?: string | null
          setor?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      log_importacoes: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          id: string
          nomes_nao_encontrados: Json | null
          periodo_ano: number
          periodo_mes: number
          qtd_linhas_ignoradas: number | null
          qtd_linhas_processadas: number | null
          qtd_vendedores: number | null
          status: string | null
          total_comissoes: number | null
          total_geral_vendido: number | null
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          nomes_nao_encontrados?: Json | null
          periodo_ano: number
          periodo_mes: number
          qtd_linhas_ignoradas?: number | null
          qtd_linhas_processadas?: number | null
          qtd_vendedores?: number | null
          status?: string | null
          total_comissoes?: number | null
          total_geral_vendido?: number | null
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          nomes_nao_encontrados?: Json | null
          periodo_ano?: number
          periodo_mes?: number
          qtd_linhas_ignoradas?: number | null
          qtd_linhas_processadas?: number | null
          qtd_vendedores?: number | null
          status?: string | null
          total_comissoes?: number | null
          total_geral_vendido?: number | null
        }
        Relationships: []
      }
      nomes_excluidos: {
        Row: {
          created_at: string | null
          id: string
          motivo: string | null
          nome_omie: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          nome_omie: string
        }
        Update: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          nome_omie?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          created_at: string | null
          id: string
          role: string
          vendedor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: string
          vendedor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfis_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_ranking"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "perfis_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      regras_comissao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          id: string
          nome: string
          percentual: number
          periodo_ano: number
          periodo_mes: number
          regime: string
          tipo_unidade: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nome: string
          percentual: number
          periodo_ano: number
          periodo_mes: number
          regime: string
          tipo_unidade?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nome?: string
          percentual?: number
          periodo_ano?: number
          periodo_mes?: number
          regime?: string
          tipo_unidade?: string | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cmc_total_movimento: string | null
          cnpj_empresa: string | null
          created_at: string | null
          data_emissao: string | null
          desconto: string | null
          descricao_produto: string | null
          familia_produto: string | null
          frete: string | null
          id: number
          local_estoque: string | null
          lucros_reais: string | null
          marca: string | null
          margem_percentual: string | null
          markup: string | null
          nota_fiscal: string | null
          operacao: string | null
          quantidade: string | null
          situacao: string | null
          total_com_desconto: string | null
          total_mercadoria: string | null
          vendedor_nome: string | null
        }
        Insert: {
          cmc_total_movimento?: string | null
          cnpj_empresa?: string | null
          created_at?: string | null
          data_emissao?: string | null
          desconto?: string | null
          descricao_produto?: string | null
          familia_produto?: string | null
          frete?: string | null
          id?: number
          local_estoque?: string | null
          lucros_reais?: string | null
          marca?: string | null
          margem_percentual?: string | null
          markup?: string | null
          nota_fiscal?: string | null
          operacao?: string | null
          quantidade?: string | null
          situacao?: string | null
          total_com_desconto?: string | null
          total_mercadoria?: string | null
          vendedor_nome?: string | null
        }
        Update: {
          cmc_total_movimento?: string | null
          cnpj_empresa?: string | null
          created_at?: string | null
          data_emissao?: string | null
          desconto?: string | null
          descricao_produto?: string | null
          familia_produto?: string | null
          frete?: string | null
          id?: number
          local_estoque?: string | null
          lucros_reais?: string | null
          marca?: string | null
          margem_percentual?: string | null
          markup?: string | null
          nota_fiscal?: string | null
          operacao?: string | null
          quantidade?: string | null
          situacao?: string | null
          total_com_desconto?: string | null
          total_mercadoria?: string | null
          vendedor_nome?: string | null
        }
        Relationships: []
      }
      vendas_gerais: {
        Row: {
          total_mercadoria: string | null
        }
        Insert: {
          total_mercadoria?: string | null
        }
        Update: {
          total_mercadoria?: string | null
        }
        Relationships: []
      }
      vendas_periodo: {
        Row: {
          id: string
          importado_em: string | null
          lucro_total: number | null
          margem_media: number | null
          percentual_aplicado: number | null
          periodo_ano: number
          periodo_mes: number
          qtd_notas: number | null
          regra_comissao_id: string | null
          status: string | null
          total_comissao: number | null
          total_desconto: number | null
          total_itens: number | null
          total_mercadoria: number | null
          total_vendido: number
          unidade_id: string
          vendedor_id: string
        }
        Insert: {
          id?: string
          importado_em?: string | null
          lucro_total?: number | null
          margem_media?: number | null
          percentual_aplicado?: number | null
          periodo_ano: number
          periodo_mes: number
          qtd_notas?: number | null
          regra_comissao_id?: string | null
          status?: string | null
          total_comissao?: number | null
          total_desconto?: number | null
          total_itens?: number | null
          total_mercadoria?: number | null
          total_vendido?: number
          unidade_id: string
          vendedor_id: string
        }
        Update: {
          id?: string
          importado_em?: string | null
          lucro_total?: number | null
          margem_media?: number | null
          percentual_aplicado?: number | null
          periodo_ano?: number
          periodo_mes?: number
          qtd_notas?: number | null
          regra_comissao_id?: string | null
          status?: string | null
          total_comissao?: number | null
          total_desconto?: number | null
          total_itens?: number | null
          total_mercadoria?: number | null
          total_vendido?: number
          unidade_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_periodo_regra_comissao_id_fkey"
            columns: ["regra_comissao_id"]
            isOneToOne: false
            referencedRelation: "regras_comissao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_periodo_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_periodo_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "v_resumo_unidade"
            referencedColumns: ["unidade_id"]
          },
          {
            foreignKeyName: "vendas_periodo_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_ranking"
            referencedColumns: ["vendedor_id"]
          },
          {
            foreignKeyName: "vendas_periodo_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedores: {
        Row: {
          ativo: boolean | null
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          nome_completo: string
          nome_omie: string
          regime: string
          setor: string | null
          unidade_id: string
        }
        Insert: {
          ativo?: boolean | null
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          nome_completo: string
          nome_omie: string
          regime?: string
          setor?: string | null
          unidade_id: string
        }
        Update: {
          ativo?: boolean | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome_completo?: string
          nome_omie?: string
          regime?: string
          setor?: string | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendedores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "v_resumo_unidade"
            referencedColumns: ["unidade_id"]
          },
        ]
      }
    }
    Views: {
      v_ranking: {
        Row: {
          lucro_total: number | null
          margem_media: number | null
          percentual_aplicado: number | null
          periodo_ano: number | null
          periodo_mes: number | null
          posicao: number | null
          qtd_notas: number | null
          regime: string | null
          status: string | null
          total_comissao: number | null
          total_itens: number | null
          total_vendido: number | null
          unidade_nome: string | null
          unidade_tipo: string | null
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Relationships: []
      }
      v_resumo_regime: {
        Row: {
          custo_comissao: number | null
          media_por_vendedor: number | null
          percentual_medio: number | null
          periodo_ano: number | null
          periodo_mes: number | null
          qtd_vendedores: number | null
          regime: string | null
          total_vendido: number | null
        }
        Relationships: []
      }
      v_resumo_unidade: {
        Row: {
          custo_comissao: number | null
          margem_media: number | null
          media_por_vendedor: number | null
          percentual_medio: number | null
          periodo_ano: number | null
          periodo_mes: number | null
          qtd_vendedores: number | null
          total_vendido: number | null
          unidade_id: string | null
          unidade_nome: string | null
          unidade_tipo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "vendedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendedor"],
    },
  },
} as const
