# bcgov/nrts-prc-api [![Lifecycle:Retired](https://img.shields.io/badge/Lifecycle-Retired-d45500)](<Redirect-URL>)

Minimal API for the ACRFD (formerly: PRC) application.

* [Admin](https://github.com/bcgov/nrts-prc-admin) - front-end for admin users.
* [Public](https://github.com/bcgov/nrts-prc-public) - front-end for public users.
* [Api](https://github.com/bcgov/nrts-prc-api) - back-end that serves both admin and public requests.

# Prerequisites

| Technology | Version | Website                                     | Description                               |
|------------|---------|---------------------------------------------|-------------------------------------------|
| node       | 8.x.x   | https://nodejs.org/en/                      | JavaScript Runtime                        |
| npm        | 6.x.x   | https://www.npmjs.com/                      | Node Package Manager                      |
| yarn       | latest  | https://yarnpkg.com/en/                     | Package Manager (more efficient than npm) |
| mongodb    | 3.2     | https://docs.mongodb.com/v3.2/installation/ | NoSQL database                            |

## Install [Node + NPM](https://nodejs.org/en/)

_Note: Windows users can use [NVM Windows](https://github.com/coreybutler/nvm-windows) to install and manage multiple versions of Node+Npm._

## Install [Yarn](https://yarnpkg.com/lang/en/docs/install/#alternatives-tab)

```
npm install -g yarn
```

## Install [MongoDB](https://docs.mongodb.com/v3.2/installation/)

# Build and Run

1. Download dependencies
```
yarn install
```
2. Run the app
```
npm start
```
3. Go to http://localhost:3000/api/docs to verify that the application is running.

    _Note: To change the default port edit `swagger.yaml`._

# Linting and Formatting

## Info

Linting and formatting is handled by a combiation of `TSlint` and `Prettier`.  The reason for this, is that you get the best of both worlds: TSlint's larger selection of linting rules with Prettier's robust formatting rules.

These 2 linters (tslint, Prettier) do have overlapping rules.  To avoid weird rule interactions, TSlint has been configured to defer any overlapping rules to Prettier, via the use of `tslint-config-prettier` in `tslint.json`.

Recommend installing the [VSCode Prettier extension](https://github.com/prettier/prettier-vscode), so Prettier's formatting can be applied on-the-fly.

### Technolgies used

[TSLint](https://palantir.github.io/tslint/), [Prettier](https://prettier.io/), [Stylelint](https://stylelint.io/), [husky](https://www.npmjs.com/package/husky), [lint-staged](https://github.com/okonet/lint-staged)

### Configuration files

* ESlint: eslint.json
* Prettier: .prettierrc .prettierignore
* Husky: package.json
* lint-staged: package.json

### Pre-Commit Hooks

Package.json has been configured to use `husky`/`lint-staged` to run the `lint-fix` (linting + formatting) commands, against the files staged to be committed, whenever you perform a commit.  This ensures that all committed code has been linted and formatted correctly.

If the linters or formatters find issues that cannot be automatically fixed, it will throw an error and provide output as to what is wrong.  Fix the issues and commit again.

## Run Linters

* Lint the `*.js` files using `ESLint`.
```
npm run lint
```

## Run Linters + Formatters

_Note: In the worst case scenario, where linting/formatting has been neglected, then these `lint-fix` commands have the potential to create 100's of file changes.  In this case, it is recommended to only run these commands as part of a separate commit._

_Note: Not all linting/formatting errors can be automatically fixed, and will require human intervention._

* Lint and fix the `*.js` files using `ESLint` + `Prettier`.

```
npm run lint-fix
```

# Testing

## Info

### Technolgies used

[Jasmine](https://jasmine.github.io/), [Karma](https://karma-runner.github.io/latest/index.html), [Protractor](http://www.protractortest.org/)

# API Specification

The API is defined in `swagger.yaml`.

If the this nrts-prc-api is running locally, you can view the api docs at: `http://localhost:3000/api/docs/`

This project uses npm package `swagger-tools` via `./app.js` to automatically generate the express server and its routes.

Recommend reviewing the [Open API Specification](https://swagger.io/docs/specification/about/) before making any changes to the `swagger.yaml` file.

# Initial Setup

1) Start server and create database by running `npm start` in root

2) Add Admin user to users collection

    ``
    db.users.insert({  "username": #{username}, "password": #{password}, roles: [['sysadmin'],['public']] })
    ``

3) Seed local database as described in [seed README](seed/README.md)

# Testing

This project is using [jest](http://jestjs.io/) as a testing framework. You can run tests with
`yarn test` or `jest`. Running either command with the `--watch` flag will re-run the tests every time a file is changed.

To run the tests in one file, simply pass the path of the file name e.g. `jest api/test/search.test.js --watch`. To run only one test in that file, chain the `.only` command e.g. `test.only("Search returns results", () => {})`.

The **_MOST IMPORTANT_** thing to know about this project's test environment is the router setup. At the time of writing this, it wasn't possible to get [swagger-tools](https://github.com/apigee-127/swagger-tools) router working in the test environment. As a result, all tests **_COMPLETELY bypass_ the real life swagger-tools router**. Instead, a middleware router called [supertest](https://github.com/visionmedia/supertest) is used to map routes to controller actions. In each controller test, you will need to add code like the following:

```javascript
const test_helper = require('./test_helper');
const app = test_helper.app;
const featureController = require('../controllers/feature.js');
const fieldNames = ['tags', 'properties', 'applicationID'];

app.get('/api/feature/:id', function(req, res) {
  let params = test_helper.buildParams({'featureId': req.params.id});
  let paramsWithFeatureId = test_helper.createPublicSwaggerParams(fieldNames, params);
  return featureController.protectedGet(paramsWithFeatureId, res);
});

test("GET /api/feature/:id  returns 200", done => {
  request(app)
    .get('/api/feature/AAABBB')
    .expect(200)
    .then(done)
});
```

This code will stand in for the swagger-tools router, and help build the objects that swagger-tools magically generates when HTTP calls go through it's router. The above code will send an object like below to the `api/controllers/feature.js` controller `protectedGet` function as the first parameter (typically called `args`).

```javascript
{
  swagger: {
    params: {
      auth_payload: {
        scopes: ['sysadmin', 'public'],
        userID: null
      },
      fields: {
        value: ['tags', 'properties', 'applicationID']
      },
      featureId: {
        value: 'AAABBB'
      }
    }
  }
}
```

Unfortunately, this results in a lot of boilerplate code in each of the controller tests. There are some helpers to reduce the amount you need to write, but you will still need to check the parameter field names sent by your middleware router match what the controller(and swagger router) expect. However, this method results in  pretty effective integration tests as they exercise the controller code and save objects in the database.


## Test Database
The tests run on an in-memory MongoDB server, using the [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) package. The setup can be viewed at [test_helper.js](api/test/test_helper.js), and additional config in [config/mongoose_options.js]. It is currently configured to wipe out the database after each test run to prevent database pollution.

[Factory-Girl](https://github.com/aexmachina/factory-girl) is used to easily create models(persisted to db) for testing purposes.

## Mocking http requests
External http calls (such as GETs to BCGW) are mocked with a tool called [nock](https://github.com/nock/nock). Currently sample JSON responses are stored in the [test/fixtures](test/fixtures) directory. This allows you to intercept a call to an external service such as bcgw, and respond with your own sample data.

```javascript
  const bcgwDomain = 'https://openmaps.gov.bc.ca';
  const searchPath = '/geo/pub/FOOO';
  const crownlandsResponse = require('./fixtures/crownlands_response.json');
  var bcgw = nock(bcgwDomain);
  let dispositionId = 666666;

  beforeEach(() => {
    bcgw.get(searchPath + urlEncodedDispositionId)
      .reply(200, crownlandsResponse);
  });

  test('returns the features data from bcgw', done => {
    request(app).get('/api/public/search/bcgw/dispositionTransactionId/' + dispositionId)
      .expect(200)
      .then(response => {
        let firstFeature = response.body.features[0];
        expect(firstFeature).toHaveProperty('properties');
        expect(firstFeature.properties).toHaveProperty('DISPOSITION_TRANSACTION_SID');
        done();
      });
  });
```

























## Running locally with Keycloak

This project uses [Keycloak](https://www.keycloak.org/) to handle authentication and manage user roles.

Required environment variables:
```
TTLS_API_ENDPOINT="<see below>"
WEBADE_AUTH_ENDPOINT="<see below>"
WEBADE_USERNAME="<see below>"
WEBADE_PASSWORD="<see below>"
```
_Note: Get the values for TTLS_API_ENDPOINT, WEBADE_AUTH_ENDPOINT, WEBADE_USERNAME and WEBADE_PASSWORD, at [Openshift](https://console.pathfinder.gov.bc.ca:8443/console/projects) &rarr; Natural Resource Public Review and Comment (dev) project &rarr; Applications &rarr; Pods &rarr; prc-api pod &rarr; Environment._

2. Before starting the local Admin project, in file `src/app/services/keycloak.service.ts`, around line 17, change code to:
```
case 'http://localhost:4200':
  // Local
  this.keycloakEnabled = true;
  break;
```
