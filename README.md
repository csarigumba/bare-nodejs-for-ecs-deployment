# bare-nodejs-for-ecs-deployment

A base NodeJS implementation to quickly verify the integration of the application to AWS RDS and AWS Elasticache Redis.

## Local Push

Make sure the AWS CLI is already configured.
Replaced the account ID to the actual AWS Account ID

```
docker build -t my-dev-app --file Dockerfile .
aws ecr get-login-password --region ap-northeast-1 --profile my-aws-profile | docker login --username AWS --password-stdin 0000000000.dkr.ecr.ap-northeast-1.amazonaws.com
docker tag my-dev-app:latest 0000000000.dkr.ecr.ap-northeast-1.amazonaws.com/my-dev-app:latest
docker push 0000000000.dkr.ecr.ap-northeast-1.amazonaws.com/my-dev-app:latest
```
