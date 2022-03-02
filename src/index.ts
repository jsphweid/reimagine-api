import { ApolloServer } from "apollo-server-lambda";
import { APIGatewayProxyHandler } from "aws-lambda";

import { genContext } from "./context";
import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";
import { Utils } from "./utils";

const parseToken = (event: any) =>
  Utils.parseTokenFromAuthHeader(event.headers.Authorization);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ event }) => genContext(parseToken(event)),
});

export const handler: APIGatewayProxyHandler = (
  event,
  lambdaContext,
  callback
) => {
  // Playground handler
  if (event.httpMethod === "GET") {
    server.createHandler()(
      { ...event, path: event.requestContext.path || event.path },
      lambdaContext,
      callback
    );
  } else {
    server.createHandler({
      cors: {
        origin: "*",
        credentials: true,
      },
    })(event, lambdaContext, callback);
  }
};
