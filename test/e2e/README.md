# End-2-End Functional Testing
This is an overview of the end-2-end UI/functional testing for keystone.  UI/functional tests ensure
regression coverage of all aspects of a real keystone application.  The tests use a real keystone
application with as much available configuration as possible.  Please note that this is not a
replacement for component-based unit testing, which attempt to do full regression coverage of all
the operations a particular component is responsible for.


## Setup
The setup is partly based on instructions at [nightwatchjs.org](http://nightwatchjs.org/guide#installation)
for nightwatch specific structure as well as partly based on a typical keystone app since the e2e test runs
with a real keystone app server.

    test/e2e
        global.js                               => common nightwatch test environment config

        server.js                               => keystone test app server

        adminUI                                 => adminUI e2e test suite
            nightwatch.json                     => nightwatch config
            pages
                ...                             => page objects representing an AdminUI screen/page
            tests
                groupNNN<group-name>            => adminUI test group, where NNN is a group sequence number
                    uiTest<test-name>           => UI test suite
                    uxTest<test-name>           => UX/functional test suite

        bin                                     => any required e2e binaries
           selenium-server-standalone-x.y.z.jar => selenium driver for local testing

        drivers
            <browser drivers>                   => all required browser drivers
            
        updates                                 => all schema update/migration files
           0.0.1-updates-e2e.js                 => keystone updates

        models                                  => all test list models
           User.js                              => keystone user list model
           ...


## Running
Testing is a critical part of any keystone commit to ensure the commit has not introduced any
UI or functional regressions.  Make sure to run all keystone tests prior to pushing any commits.
If your commit fixes a bug but breaks the UI/functional test suite please make sure that you also
update the test suite so that any broken tests pass again.  You can run any of the following
from keystone's root directory:

    Pre-requisites:
        - Make sure that you have Firefox(or Chrome) installed.  Firefox is the default browser used.
          Using Chrome requires specifying a different --env parameter (see below).  For any tests below
          you may replace the "--env default" parameter with one of the following:
          
            --env chrome, if you are on a linux 64-bit system
            --env chrome-linux32, if you are on a linux 32-bit system
            --env chrome-mac32, if you are on a mac system
            --env chrome-win32, if you are on a windows system
            
        - Make sure that you have a local mongo instance running.
        - Make sure that port 3000 is available; if not please tell the e2e server what port it
          should bind to.  For example, to use port 9999 do the following (in a bash shell):

            export KEYSTONEJS_PORT=9999

    Running in your local environment using all defaults (good to do before doing a commit):

        npm run test-e2e
        
    If the above npm run command does not work for you then there are some issues with selenium and some platforms.
    Try the following instead:
    
        npm run test-e2e-bg

    If you are in active development and just want to run a single group in your local environment:

        node test/e2e/server.js --env default --config ./test/e2e/adminUI/nightwatch.json --group test/e2e/adminUI/tests/<group>
        
        or, if the above doesn't work in your platform try: 
        
        node test/e2e/server.js --env default --selenium-in-background --config ./test/e2e/adminUI/nightwatch-no-process.json --group test/e2e/adminUI/tests/<group> 

    Running a single test in your local environment:

        node test/e2e/server.js --env default --config ./test/e2e/adminUI/nightwatch.json --test test/e2e/adminUI/tests/<group>/<test>
        
        or, if the above doesn't work in your platform try: 
        
        node test/e2e/server.js --env default --selenium-in-background --config ./test/e2e/adminUI/nightwatch-no-process.json --test test/e2e/adminUI/tests/<group>/<test> 
        

    Travis builds will run:

        npm run test-e2e-saucelabs

    If you want to run the e2e keystone test app server standalone then run as follows:

        export KEYSTONEJS_PORT=9999 && node test/e2e/server.js --notest

    If you want to run the e2e keystone test app server standalone without dropping the database then run as follows:

        export KEYSTONEJS_PORT=9999 && node test/e2e/server.js --notest --nodrop


    This allows you to experiment with the exact same setup the test do!


## Adding New Tests
You should consider adding new UI/UX/Functional tests if:

- you introduce new UI elements (e.g., a new field type).
- you introduce new client side functionality that may cause a different UX experience.
- you introduce new server side functionality that may cause a different UX experience.
- you fix a bug that's does not have UI/UX/Functional test coverage


## Test Organization
The best approach to keeping tests well organized is to:

- when writing new tests, use an existing one as an example.
- keep the test style consistent.
- keep the test file structure consistent.
- each test group must run on its own using the `--group` argument (that means, that each test within the group must undo
any changes it does to the state of the UI)
- each test within a group must run on its own using the `--test` argument (that means, that each test must undo
any changes it does to the state of the UI)
- when naming selectors (e.g., in adminUI.js) make sure to use a very descriptive name


## Adding Field Tests

- add a model for the field to test/e2e/models/fields/<Field-Name>.js
- add the field collection to the fields nav in test/e2e/server.js
- add a page object for the field to test/e2e/adminUI/pages/fieldTypes
- add a page object for the list testing the field to test/e2e/adminUI/pages/lists
- add uiTest<Field-Name>Field.js to test/e2e/adminUI/group005Fields
- add uxTest<Field-Name>Field.js to test/e2e/adminUI/group005Fields


## Some about nightwatch Page Objects(PO)
Since we use nightwatch Page Objects(PO) quite a bit in e2e then here are some notes to keep in mind:

- a PO is basically an abstraction of a view/page.  It defines:

    - elements and their selectors.  For example:

        elements: {
            elem1: 'a-selector-could-be-defined-via-a-simple-string'
        }
        or,
        elements: {
            elem1: {
                selector: 'a-selector-could-be-defined-via-the-selector-property-if-need-to-provide-a-strategy',
                locateStrategy: 'xpath',
            }
        }

    - commands.  For example:

        commands: [{
            waitForElem1ToShowUp: function () {
                return this
                    .waitForElementVisible('@elem1');
            },
        }],

    - tests `before:` should define all POs the test will need to interact with.  For example:

        before: function (browser) {
            browser.spa = browser.page.spa();
            browser.spa.navigate();
        }

        then in tests you can access the spa PO as follows:

            browser.spa
                .click('@fieldsMenu')

        in PO commands you can access the POs as follows:

            this.api.spa
                .click('@fieldsMenu')

- list POs are very special.  The abstract a list and its fields.  They also include the commands that can be executed
    against the list.  They should all have the same format.  The only things that may vary are the field names, the
    number of fields, and the selectors, and the number of commands (the more fields the more commands since there
    are commands per field in the list).  Unlike other page objects, list objects are not meant to be directly created.
    Instead, these are required by other page objects (e.g., the item page object).  All selector lookups and commands
    executed against a list are done in the context of the page that required the list.


## Some Don'ts
Here are some don'ts that may cross your mind as good ideas but shouldn't:

- don't do something like the following in the lists.  Although it may sound like a good idea at first, think about it
    a bit more shows some pitfalls the main one being that lists do not know in which form they are being used.  For
    example, the initial modal form may only show fields that the user marked as _initial_ when defining the keystone
    list.

        assertUI: function() {
            this.expect.section('@name').to.be.visible;
            this.expect.section('@fieldA').to.be.visible;
        }

- in [here](http://martinfowler.com/bliki/PageObject.html) Martin Fowler suggests that no assertions be done in page
    objects.  For the most part we are sticking to that suggestion.  The only place where we currently do assertions
    is in the field type definitions, since the fields know better about their contained path elements.  So please
    try not to add assertions anywhere else in page objects as doing so may have subtle pitfalls.
