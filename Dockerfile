FROM node:18-alpine

WORKDIR /app

# Copy package files and install ALL dependencies (including dev dependencies like tsx)
COPY package*.json ./
RUN npm install

# Copy the pre-built application
COPY . .

# Create necessary directories
RUN mkdir -p public/uploads data logs

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1

# Build args for NEXT_PUBLIC_* vars (baked into client bundle at build time)
ARG NEXT_PUBLIC_SSO_LOGIN_URL
ARG NEXT_PUBLIC_SSO_CLIENT_ID
ARG NEXT_PUBLIC_SOCKET_URL

ENV NEXT_PUBLIC_SSO_LOGIN_URL=$NEXT_PUBLIC_SSO_LOGIN_URL
ENV NEXT_PUBLIC_SSO_CLIENT_ID=$NEXT_PUBLIC_SSO_CLIENT_ID
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
