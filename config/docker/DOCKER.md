# config/docker

This folder holds all docker-related configuration files.

### dev.docker-compose.yml

Used for starting a local postgres database

### test.docker-compose.yml

Same as dev.docker-compose.yml, however, it can be extended in the future for anything else we would like to test.
This may be rewritten to run the built image so that we're testing on the image that will be deployed, rather than just the code.

### prod.docker-compose.yml

Runs a postgres database along with the app itself. This is considered the bare minimum needed for this application to be deployed to production.
If there are additional services needed for specifically this app, they can be included. If there is a related app but is not directly a dependency of this one, an infrastructure dedicated repository should be used.

### Dockerfile

This is the script used to build the docker image.
You can build this using `docker build ./config/docker -t [appname]`.
Otherwise, it is used mainly for CI.

### run.sh

This file is used to start the server itself. It's not my favorite solution but due to the way drizzle is used, the database must be migrated before anything can run.
For production, this should be ok.
