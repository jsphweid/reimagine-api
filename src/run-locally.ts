import { ApolloServer } from "apollo-server";
import * as dotenv from "dotenv";

import { genContext } from "./context";
import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";
import { Utils } from "./utils";

dotenv.config();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) =>
    genContext(Utils.parseTokenFromAuthHeader(req.headers.authorization)),
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
