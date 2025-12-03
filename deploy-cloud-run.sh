#!/bin/bash

# WealthTrack - Cloud Run Deployment Script
# This script builds and deploys your app to Google Cloud Run

set -e

# Configuration
PROJECT_ID="deep-span-266614"
SERVICE_NAME="wealthtrack"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting deployment to Cloud Run..."

# Set the project
echo "📦 Setting GCP project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Build the Docker image using Cloud Build
echo "🔨 Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set-env-vars "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" \
  --set-env-vars "GCP_PROJECT_ID=$GCP_PROJECT_ID" \
  --set-env-vars "GCP_DATASET_ID=$GCP_DATASET_ID" \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS_JSON=$GOOGLE_APPLICATION_CREDENTIALS_JSON" \
  --set-env-vars "ALLOWED_EMAIL=$ALLOWED_EMAIL"

echo "✅ Deployment complete!"
echo ""
echo "Your app is now live. Run this command to get the URL:"
echo "gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'"
