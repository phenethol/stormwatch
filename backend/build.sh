#!/usr/bin/env bash
# Build naredba za Render (Root Directory: backend)
set -o errexit

# React frontend; Django ga poslužuje iz ../frontend/dist (WhiteNoise).
# --include=dev jer su Vite i TypeScript u devDependencies.
(cd ../frontend && npm ci --include=dev && npm run build)

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
