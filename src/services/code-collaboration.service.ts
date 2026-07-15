export interface Participant {
  userId: string;
  role: 'mentor' | 'mentee' | 'viewer';
}

export interface CursorPosition {
  userId: string;
  lineNumber: number;
  column: number;
}

export interface Annotation {
  id: string;
  userId: string;
  lineNumber: number;
  text: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
}

export interface CodeSession {
  sessionId: string;
  language: string;
  code: string;
  participants: Participant[];
  cursors: CursorPosition[];
  annotations: Annotation[];
  executionResults?: ExecutionResult[];
}

export class CodeCollaborationService {
  private sessions: Map<string, CodeSession> = new Map();

  createSession(sessionId: string, language: string, code: string): CodeSession {
    const session: CodeSession = {
      sessionId,
      language,
      code,
      participants: [],
      cursors: [],
      annotations: []
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): CodeSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateCode(sessionId: string, code: string): CodeSession | null {
    const session = this.getSession(sessionId);
    if (session) {
      session.code = code;
      return session;
    }
    return null;
  }
}
