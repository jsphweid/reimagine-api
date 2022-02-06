import Executor from "./executor";

export interface Context {
  executor: Executor | null;
}

export const genContext = ({ req }: any): Promise<Context> => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(" ")[1] : "";
  return Executor.fromToken(token).then((executor) => ({ executor }));
};
