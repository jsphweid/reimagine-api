import * as jwksClient from "jwks-rsa";
import * as jwt from "jsonwebtoken";

export interface ParsedToken {
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  exp: number;
  azp: string;
  scope: string;
  permissions?: string[];
}

export function verifyToken(token: string): Promise<ParsedToken> {
  const client = jwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  });

  const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
      callback(null, key.getPublicKey());
    });
  };

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        algorithms: ["RS256"],
      },
      function (err, decoded) {
        if (decoded) {
          resolve(decoded as ParsedToken);
        } else {
          reject(err);
        }
      }
    );
  });
}
