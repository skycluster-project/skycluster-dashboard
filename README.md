# SkyCluster Dashboard

## Installation

To install the Skycluster Dashboard please refer to the [SkyCluster docs](https://skycluster.io/).


### Manual Deployment

- Run the frontend `pkg/frontend`. Check out [Readme.md](pkg/frontend/).
- Run the backend `pkg/backend` using:

```bash
# go version 1.22
export GO_ENV=dev

go mod tidy

go run . -v
```

Now you can access the backend at `localhost:8090/api` using curl and frontend at `localhost:5173`. When accessing for development purposes make sure both ports are accessible within the development environemnt; e.g.:

```bash
ssh dev-server -L5173:localhost:5173 -L8090:localhost:8090
```


This repository is a forked of [komoplane](https://github.com/komodorio/komoplane) repository.