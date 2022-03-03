set -e
npm run build
cd cdk/
npm run build
npx cdk deploy
