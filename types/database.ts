export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "vendor" | "admin";

export type RFPStatus = "draft" | "published" | "closed" | "awarded" | "cancelled";

export type BidStatus =
  | "pending"
  | "under_review"
  | "shortlisted"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ContractStatus = "active" | "completed" | "terminated";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          company_name: string | null;
          company_address: string | null;
          company_phone: string | null;
          company_registration: string | null;
          contact_person: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          company_name?: string | null;
          company_address?: string | null;
          company_phone?: string | null;
          company_registration?: string | null;
          contact_person?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          company_name?: string | null;
          company_address?: string | null;
          company_phone?: string | null;
          company_registration?: string | null;
          contact_person?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      rfps: {
        Row: {
          id: string;
          reference_number: string;
          title: string;
          description: string;
          category_id: string;
          estimated_value: number | null;
          submission_deadline: string;
          status: RFPStatus;
          requirements: string | null;
          evaluation_criteria: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          reference_number?: string;
          title: string;
          description: string;
          category_id: string;
          estimated_value?: number | null;
          submission_deadline: string;
          status?: RFPStatus;
          requirements?: string | null;
          evaluation_criteria?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          reference_number?: string;
          title?: string;
          description?: string;
          category_id?: string;
          estimated_value?: number | null;
          submission_deadline?: string;
          status?: RFPStatus;
          requirements?: string | null;
          evaluation_criteria?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      rfp_documents: {
        Row: {
          id: string;
          rfp_id: string;
          name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          rfp_id: string;
          name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          rfp_id?: string;
          name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          uploaded_by?: string;
          created_at?: string;
        };
      };
      bids: {
        Row: {
          id: string;
          rfp_id: string;
          vendor_id: string;
          amount: number;
          proposal: string;
          status: BidStatus;
          admin_notes: string | null;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rfp_id: string;
          vendor_id: string;
          amount: number;
          proposal: string;
          status?: BidStatus;
          admin_notes?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rfp_id?: string;
          vendor_id?: string;
          amount?: number;
          proposal?: string;
          status?: BidStatus;
          admin_notes?: string | null;
          submitted_at?: string;
          updated_at?: string;
        };
      };
      bid_documents: {
        Row: {
          id: string;
          bid_id: string;
          name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bid_id: string;
          name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          bid_id?: string;
          name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          created_at?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          rfp_id: string;
          bid_id: string;
          vendor_id: string;
          contract_value: number;
          start_date: string;
          end_date: string;
          status: ContractStatus;
          terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rfp_id: string;
          bid_id: string;
          vendor_id: string;
          contract_value: number;
          start_date: string;
          end_date: string;
          status?: ContractStatus;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rfp_id?: string;
          bid_id?: string;
          vendor_id?: string;
          contract_value?: number;
          start_date?: string;
          end_date?: string;
          status?: ContractStatus;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      generate_rfp_reference: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      rfp_status: RFPStatus;
      bid_status: BidStatus;
      contract_status: ContractStatus;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type RFP = Database["public"]["Tables"]["rfps"]["Row"];
export type RFPDocument = Database["public"]["Tables"]["rfp_documents"]["Row"];
export type Bid = Database["public"]["Tables"]["bids"]["Row"];
export type BidDocument = Database["public"]["Tables"]["bid_documents"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export type RFPWithCategory = RFP & {
  categories: Category;
};

export type BidWithDetails = Bid & {
  rfps: RFPWithCategory;
  profiles: Profile;
  bid_documents: BidDocument[];
};

export type RFPWithDetails = RFP & {
  categories: Category;
  rfp_documents: RFPDocument[];
  bids?: BidWithDetails[];
};

export type ContractWithDetails = Contract & {
  rfps: RFP;
  bids: Bid;
  profiles: Profile;
};
