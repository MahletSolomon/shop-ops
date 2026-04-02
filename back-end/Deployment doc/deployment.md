# ShopOps - Deployment

> Overview of the ShopOps backend deployment architecture and infrastructure.

## Production

| Field            | Value                                                    |
|------------------|----------------------------------------------------------|
| **API Base URL** | `https://shopops-backend-production.up.railway.app`      |
| **Platform**     | [Railway](https://railway.app)                           |
| **Registry**     | [Docker Hub](https://hub.docker.com)                     |
| **Runtime**      | Alpine Linux 3.21 (containerized)                        |
| **Language**     | Go 1.25                                                  |

---

## Deployment Architecture

The backend is containerized using Docker with a **multi-stage build** and deployed to Railway via Docker Hub.

- **Stage 1 (Build):** Uses `golang:1.25-alpine` to compile the Go source code into a static binary.
- **Stage 2 (Runtime):** Uses a minimal `alpine:3.21` image containing only the compiled binary, CA certificates (for MongoDB Atlas TLS), and timezone data.

The final image is pushed to Docker Hub, which serves as the container registry. Railway pulls the image from Docker Hub and runs the container in production.

The application connects to a **MongoDB Atlas** cluster for persistent data storage.

### Deployment Diagram

![Deployment Architecture Diagram](../Deployment%20doc/Diagram.png)

---

## Environment Configuration

The following environment variables are configured in Railway's dashboard:

| Variable       | Description                          |
|----------------|--------------------------------------|
| `PORT`         | Server port (assigned by Railway)    |
| `MONGO_URI`    | MongoDB Atlas connection string      |
| `DB_NAME`      | Target database name                 |
| `JWT_SECRET`   | Secret key for JWT authentication    |
| `GIN_MODE`     | Gin framework mode (`release`)       |

---

## Key Infrastructure Decisions

| Decision                     | Rationale                                                        |
|------------------------------|------------------------------------------------------------------|
| Multi-stage Docker build     | Reduces final image size by excluding build tools and source code |
| Alpine Linux base            | Minimal footprint (~5 MB base) for fast cold starts              |
| Docker Hub as registry       | Simple integration with Railway's image-based deployments        |
| Railway as hosting platform  | Managed container hosting with automatic HTTPS and scaling       |
| MongoDB Atlas                | Managed database with built-in replication and backups           |
