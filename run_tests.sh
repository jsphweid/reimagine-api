export AWS_PAGER=""
export AWS_DEFAULT_REGION=local-env
export DYNAMODB_TABLE_NAME=ReimagineTestTable

aws dynamodb --endpoint-url=http://localhost:4566 delete-table --table-name $DYNAMODB_TABLE_NAME

aws dynamodb --endpoint-url=http://localhost:4566 create-table \
    --table-name $DYNAMODB_TABLE_NAME \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=GSI1-PK,AttributeType=S \
        AttributeName=GSI1-SK,AttributeType=S \
        AttributeName=GSI2-PK,AttributeType=S \
        AttributeName=RecordingCount,AttributeType=N \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=10,WriteCapacityUnits=5 \
    --global-secondary-indexes \
      IndexName=GSI1,KeySchema=["{AttributeName=GSI1-PK,KeyType=HASH}","{AttributeName=GSI1-SK,KeyType=RANGE}"],Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=10,WriteCapacityUnits=10}" \
      IndexName=GSI2,KeySchema=["{AttributeName=GSI2-PK,KeyType=HASH}","{AttributeName=GSI1-SK,KeyType=RANGE}"],Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=10,WriteCapacityUnits=10}" \
      IndexName=GSI3,KeySchema=["{AttributeName=RecordingCount,KeyType=HASH}","{AttributeName=SK,KeyType=RANGE}"],Projection="{ProjectionType=ALL}",ProvisionedThroughput="{ReadCapacityUnits=10,WriteCapacityUnits=10}"

node_modules/.bin/jest
