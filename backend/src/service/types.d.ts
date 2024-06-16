import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: any; // ou substitua `any` pelo tipo correto do seu usuário
}
