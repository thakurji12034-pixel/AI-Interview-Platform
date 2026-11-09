FROM node:22-bookworm-slim

WORKDIR /app

# Install Python and pip for resume ML classifier
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install Python ML dependencies
COPY ml/requirements.txt ./ml/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r ./ml/requirements.txt

# Copy backend source and ML model
COPY src ./src
COPY ml ./ml

# Prepare resume storage
RUN mkdir -p /app/storage/resumes

ENV NODE_ENV=production
ENV PYTHON_BIN=python3

EXPOSE 5000

CMD ["node", "src/server.js"]
