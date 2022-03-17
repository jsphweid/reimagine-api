set -e
npm run build
npm run test
cd cdk/
npm run build
npx cdk deploy
