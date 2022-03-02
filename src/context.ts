import Executor from "./executor";

export interface Context {
  executor: Executor | null;
  now: Date;
}

export const genContext = (token: string): Promise<Context> => {
  return Executor.fromToken(token).then((executor) => ({
    executor,
    now: new Date(),
  }));
};
