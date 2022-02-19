import { ApolloServer } from "apollo-server";
import * as dotenv from "dotenv";

import { genContext } from "./context";
import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";

dotenv.config();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: genContext,
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
