import { Resolvers } from "../generated";

export const resolvers: Resolvers = {
  Query: {
    hello: (a, b, c, d) => {
      console.log("c", c);
      return "";
    },
  },
};
