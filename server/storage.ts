import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import { 
  users, 
  documents, 
  analysisRequests, 
  comprehensiveReports,
  type User, 
  type InsertUser,
  type Document,
  type InsertDocument,
  type AnalysisRequest,
  type InsertAnalysisRequest,
  type ComprehensiveReport,
  type InsertComprehensiveReport
} from "@shared/schema";

// Database connection with proper error handling
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Storage interface with user isolation enforcement
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokenBalance(userId: string, newBalance: number): Promise<void>;
  
  // Document management with user isolation
  getUserDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string, userId: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string, userId: string): Promise<boolean>;
  
  // Analysis requests with user isolation
  getUserAnalysisRequests(userId: string): Promise<AnalysisRequest[]>;
  getAnalysisRequest(id: string, userId: string): Promise<AnalysisRequest | undefined>;
  createAnalysisRequest(request: InsertAnalysisRequest): Promise<AnalysisRequest>;
  updateAnalysisResult(id: string, userId: string, result: string): Promise<void>;
  
  // Comprehensive reports with user isolation
  getUserComprehensiveReports(userId: string): Promise<ComprehensiveReport[]>;
  createComprehensiveReport(report: InsertComprehensiveReport): Promise<ComprehensiveReport>;
  getComprehensiveReport(id: string, userId: string): Promise<ComprehensiveReport | undefined>;
}

export class NeonStorage implements IStorage {
  
  // User management methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUserTokenBalance(userId: string, newBalance: number): Promise<void> {
    await db.update(users)
      .set({ token_balance: newBalance })
      .where(eq(users.id, userId));
  }

  // Document management with strict user isolation
  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.user_id, userId));
  }

  async getDocument(id: string, userId: string): Promise<Document | undefined> {
    const result = await db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.user_id, userId)));
    return result[0];
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(documents)
      .where(and(eq(documents.id, id), eq(documents.user_id, userId)))
      .returning();
    return result.length > 0;
  }

  // Analysis requests with strict user isolation
  async getUserAnalysisRequests(userId: string): Promise<AnalysisRequest[]> {
    return await db.select().from(analysisRequests)
      .where(eq(analysisRequests.user_id, userId));
  }

  async getAnalysisRequest(id: string, userId: string): Promise<AnalysisRequest | undefined> {
    const result = await db.select().from(analysisRequests)
      .where(and(eq(analysisRequests.id, id), eq(analysisRequests.user_id, userId)));
    return result[0];
  }

  async createAnalysisRequest(request: InsertAnalysisRequest): Promise<AnalysisRequest> {
    const result = await db.insert(analysisRequests).values(request).returning();
    return result[0];
  }

  async updateAnalysisResult(id: string, userId: string, result: string): Promise<void> {
    await db.update(analysisRequests)
      .set({ result })
      .where(and(eq(analysisRequests.id, id), eq(analysisRequests.user_id, userId)));
  }

  // Comprehensive reports with strict user isolation
  async getUserComprehensiveReports(userId: string): Promise<ComprehensiveReport[]> {
    return await db.select().from(comprehensiveReports)
      .where(eq(comprehensiveReports.user_id, userId));
  }

  async createComprehensiveReport(report: InsertComprehensiveReport): Promise<ComprehensiveReport> {
    const result = await db.insert(comprehensiveReports).values(report).returning();
    return result[0];
  }

  async getComprehensiveReport(id: string, userId: string): Promise<ComprehensiveReport | undefined> {
    const result = await db.select().from(comprehensiveReports)
      .where(and(eq(comprehensiveReports.id, id), eq(comprehensiveReports.user_id, userId)));
    return result[0];
  }
}

// Legacy MemStorage for backward compatibility (will be replaced)
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private documents: Map<string, Document>;
  private analysisRequests: Map<string, AnalysisRequest>;
  private comprehensiveReports: Map<string, ComprehensiveReport>;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.analysisRequests = new Map();
    this.comprehensiveReports = new Map();
  }

  // Implement all interface methods with in-memory storage
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const newUser: User = { 
      ...user, 
      id,
      created_at: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserTokenBalance(userId: string, newBalance: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.token_balance = newBalance;
      this.users.set(userId, user);
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.user_id === userId);
  }

  async getDocument(id: string, userId: string): Promise<Document | undefined> {
    const doc = this.documents.get(id);
    return doc && doc.user_id === userId ? doc : undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = crypto.randomUUID();
    const newDoc: Document = {
      ...document,
      id,
      uploaded_at: new Date()
    };
    this.documents.set(id, newDoc);
    return newDoc;
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const doc = this.documents.get(id);
    if (doc && doc.user_id === userId) {
      this.documents.delete(id);
      return true;
    }
    return false;
  }

  async getUserAnalysisRequests(userId: string): Promise<AnalysisRequest[]> {
    return Array.from(this.analysisRequests.values()).filter(req => req.user_id === userId);
  }

  async getAnalysisRequest(id: string, userId: string): Promise<AnalysisRequest | undefined> {
    const req = this.analysisRequests.get(id);
    return req && req.user_id === userId ? req : undefined;
  }

  async createAnalysisRequest(request: InsertAnalysisRequest): Promise<AnalysisRequest> {
    const id = crypto.randomUUID();
    const newRequest: AnalysisRequest = {
      ...request,
      id,
      result: null,
      created_at: new Date()
    };
    this.analysisRequests.set(id, newRequest);
    return newRequest;
  }

  async updateAnalysisResult(id: string, userId: string, result: string): Promise<void> {
    const req = this.analysisRequests.get(id);
    if (req && req.user_id === userId) {
      req.result = result;
      this.analysisRequests.set(id, req);
    }
  }

  async getUserComprehensiveReports(userId: string): Promise<ComprehensiveReport[]> {
    return Array.from(this.comprehensiveReports.values()).filter(rep => rep.user_id === userId);
  }

  async createComprehensiveReport(report: InsertComprehensiveReport): Promise<ComprehensiveReport> {
    const id = crypto.randomUUID();
    const newReport: ComprehensiveReport = {
      ...report,
      id,
      created_at: new Date()
    };
    this.comprehensiveReports.set(id, newReport);
    return newReport;
  }

  async getComprehensiveReport(id: string, userId: string): Promise<ComprehensiveReport | undefined> {
    const rep = this.comprehensiveReports.get(id);
    return rep && rep.user_id === userId ? rep : undefined;
  }
}

// Use NeonStorage if DATABASE_URL is available, otherwise fall back to MemStorage
export const storage: IStorage = process.env.DATABASE_URL ? new NeonStorage() : new MemStorage();
