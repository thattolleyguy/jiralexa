/**
 * Lambda function for handling Alexa Skill requests that uses Jira REST api through JQL (Jira Query Language):
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask Jira what's the number of open tickets for CAMEL?"
 *  Alexa: "(queries Jira REST api and finds the number of tickets)"
 */

'use strict';

var AlexaSkill = require('./AlexaSkill');

var config = require('./config.json');

var request = require('request');

var appId = config.appId;

var JiraManager = function () {
    AlexaSkill.call(this, appId);
};

JiraManager.prototype = Object.create(AlexaSkill.prototype);
JiraManager.prototype.constructor = JiraManager;

JiraManager.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    var speechText = "Welcome to the Jira Helper. You can ask a question like, what's the current status for this ticket? ... Now, what can I help you with.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "For instructions on what you can say, please say help me.";
    response.ask(speechText, repromptText);
};

JiraManager.prototype.intentHandlers = {
    "GetTicketStatus": function (intent, session, alexaResponse) {
        var projectSlot = intent.slots.Project;
        var ticketNumberSlot = intent.slots.TicketNumber;
        var rangeSlot = intent.slots.Range;
        var jql, speechOutput, repromptOutput, speech;

        var hasTicketNumber = ticketNumberSlot && ticketNumberSlot.value;
        var hasRange = rangeSlot && rangeSlot.value;

        if (hasTicketNumber) {
            jql = "key=" + projectSlot.value.toUpperCase() + "-" + ticketNumberSlot.value.toString();
        } else {
            if (hasRange) {
                jql = "project=" + projectSlot.value.toUpperCase() + " AND resolutiondate >= startOfDay(" + "-" + rangeSlot.value.toString() + ")";
            } else {
                jql = "project=" + projectSlot.value.toUpperCase() + " AND status in (Open, \"In Progress\", Reopened) ORDER BY created DESC";
            }
        }

        return request({
            url: config.endpoint,
            method: "POST",
            json: true,
            body: {
                "jql": jql,
                "maxResults": config.maxResults
            },
            headers: {
                "Authorization": "Basic " + (new Buffer(config.username + ":" + config.password)).toString("base64"),
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                if (hasTicketNumber) {
                    speech = "<speak>I'm sorry, I currently do not know the status for ticket: " + projectSlot.value.toUpperCase() + " - " + "<say-as interpret-as='digits'/>" + ticketNumberSlot.value.toString() + "</say-as></speak>";
                } else {
                    speech = "<speak>I'm sorry, I currently do not know the status for project: " + projectSlot.value.toUpperCase() + "</speak>";
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                repromptOutput = {
                    speech: "What else can I help with?",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.ask(speechOutput, repromptOutput);
            } else {
                console.log(response.statusCode, body);
                console.log(response.statusCode, body);
                if (hasTicketNumber) {
                    if (body.total === 0) {
                        speech = "<speak>I'm sorry, I currently do not know the status for ticket " + projectSlot.value + " - " + "<say-as interpret-as='digits'/>" + ticketNumberSlot.value.toString() + "</say-as></speak>";
                    } else {
                        speech = "" +
                            "<speak>" +
                            "<p>The Summary for ticket " + projectSlot.value + "<say-as interpret-as='digits'>" + ticketNumberSlot.value + "</say-as>" + " is the following:</p>" +
                            "<p>Description:<break time='0.5s'/>" + body.issues[0].fields.summary + "</p>" +
                            "<p>Priority:<break time='0.5s'/>" + body.issues[0].fields.priority.name + "</p>" +
                            "<p>Reporter:<break time='0.5s'/>" + body.issues[0].fields.reporter.name + "</p>" +
                            "<p>Type:<break time='0.5s'/>" + body.issues[0].fields.issuetype.name + "</p>" +
                            "<p>Status:<break time='0.5s'/>" + body.issues[0].fields.status.name + "</p>" +
                            "</speak>";
                    }
                    speechOutput = {
                        speech: speech,
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    repromptOutput = {
                        speech: "What else can I help with?",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.ask(speechOutput, repromptOutput);
                } else {
                    speechOutput = {
                        speech: "<speack>There are<break time='1s'/>" + body.total + " tickets found with the specified criteria</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.tell(speechOutput);
                }
            }
        });
    },
    "GetDeveloperStatus": function (intent, session, alexaResponse) {
        var usernameSlot = intent.slots.Username;
        var projectSlot = intent.slots.Project;
        var statusSlot = intent.slots.Status;

        var hasStatus = statusSlot && statusSlot.value;
        var jql, speechOutput, repromptOutput, speech;

        if (hasStatus) {
            jql = "project=" + projectSlot.value.toUpperCase() + " AND status = " + statusSlot.value + " AND assignee = " + usernameSlot.value;
        } else {
            jql = "project=" + projectSlot.value.toUpperCase() + " AND status in (Open, \"In Progress\", Reopened) ORDER BY created DESC";
        }

        return request({
            url: config.endpoint,
            method: "POST",
            json: true,
            body: {
                "jql": jql,
                "maxResults": config.maxResults
            },
            headers: {
                "Authorization": "Basic " + (new Buffer(config.username + ":" + config.password)).toString("base64"),
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                if (hasStatus) {
                    speech = "<speak>I'm sorry, I currently cannot find tickets for user " + usernameSlot.value + " and project " + projectSlot.value.toUpperCase() + " with status " + statusSlot.value + "</speak>";
                } else {
                    speech = "<speak>I'm sorry, I currently cannot find tickets for user " + statusSlot.value + " and project " + projectSlot.value.toUpperCase() + "</speak>";
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                repromptOutput = {
                    speech: "What else can I help with?",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.ask(speechOutput, repromptOutput);
            } else {
                console.log(response.statusCode, body);
                if (hasStatus) {
                    if (body.total === 0) {
                        speech = "<speak>I'm sorry, I currently cannot find tickets for user " + usernameSlot.value + " and project " + projectSlot.value.toUpperCase() + " with status " + statusSlot.value + "</speak>";
                    } else {
                        speech = "<speak>I'm sorry, I currently cannot find tickets for user " + usernameSlot.value + " and project " + projectSlot.value.toUpperCase() + "</speak>";
                    }
                    speechOutput = {
                        speech: speech,
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    repromptOutput = {
                        speech: "What else can I help with?",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.ask(speechOutput, repromptOutput);
                } else {
                    speechOutput = {
                        speech: "<speack>There are<break time='1s'/>" + body.total + " tickets found with the specified criteria</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.tell(speechOutput);
                }
            }
        });
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "You can ask questions about Jira Status such as, what's the number of open tickets for Spring, or, you can say exit... Now, what can I help you with?";
        var repromptText = "You can say things like, what's the number of open tickets for Spring, or you can say exit... Now, what can I help you with?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    }
};

exports.handler = function (event, context) {
    var jiraManager = new JiraManager();
    jiraManager.execute(event, context);
};
