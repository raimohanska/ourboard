import { OpenAPIV3 } from "openapi-types"

const spec: { paths: OpenAPIV3.PathsObject } = {
    paths: {
        "/api/v1/board": {
            post: {
                description: "Creates a new board.",
                tags: ["Board"],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "accessPolicy"],
                                properties: {
                                    name: { type: "string" },
                                    accessPolicy: {
                                        type: "object",
                                        required: ["allowList"],
                                        properties: {
                                            allowList: {
                                                type: "array",
                                                items: {
                                                    anyOf: [
                                                        {
                                                            type: "object",
                                                            required: ["email"],
                                                            properties: { email: { type: "string" } },
                                                        },
                                                        {
                                                            type: "object",
                                                            required: ["domain"],
                                                            properties: { domain: { type: "string" } },
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["id", "accessToken"],
                                    properties: { id: { type: "string" }, accessToken: { type: "string" } },
                                },
                            },
                        },
                    },
                    "400": { description: "Bad Request", content: { "text/plain": { schema: { type: "string" } } } },
                },
            },
        },
        "/api/v1/board/{boardId}": {
            put: {
                description: "Changes board name and, optionally, access policy.",
                tags: ["Board"],
                parameters: [
                    { name: "boardId", in: "path", required: true },
                    { name: "API_TOKEN", in: "header", required: false },
                ],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "accessPolicy"],
                                properties: {
                                    name: { type: "string" },
                                    accessPolicy: {
                                        type: "object",
                                        required: ["allowList"],
                                        properties: {
                                            allowList: {
                                                type: "array",
                                                items: {
                                                    anyOf: [
                                                        {
                                                            type: "object",
                                                            required: ["email"],
                                                            properties: { email: { type: "string" } },
                                                        },
                                                        {
                                                            type: "object",
                                                            required: ["domain"],
                                                            properties: { domain: { type: "string" } },
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } },
                            },
                        },
                    },
                    "400": { description: "Bad Request", content: { "text/plain": { schema: { type: "string" } } } },
                    "404": { description: "Not Found" },
                    "500": { description: "Internal Server Error" },
                },
            },
        },
        "/api/v1/webhook/github/{boardId}": {
            post: {
                description: "GitHub webhook",
                tags: ["Webhooks"],
                parameters: [{ name: "boardId", in: "path", required: true }],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: [],
                                properties: {
                                    issue: {
                                        type: "object",
                                        required: ["html_url", "title", "number", "state", "labels"],
                                        properties: {
                                            html_url: { type: "string" },
                                            title: { type: "string" },
                                            number: { type: "number" },
                                            state: { type: "string" },
                                            labels: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    required: ["name"],
                                                    properties: { name: { type: "string" } },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "OK" },
                    "400": { description: "Bad Request", content: { "text/plain": { schema: { type: "string" } } } },
                    "500": { description: "Internal Server Error" },
                },
            },
        },
        "/api/v1/board/{boardId}/item": {
            post: {
                description: "Creates a new item on given board.",
                tags: ["Board"],
                parameters: [
                    { name: "boardId", in: "path", required: true },
                    { name: "API_TOKEN", in: "header", required: false },
                ],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["x", "y", "type", "text", "color", "width", "height"],
                                properties: {
                                    x: { type: "number" },
                                    y: { type: "number" },
                                    type: { type: "string", enum: ["note"] },
                                    text: { type: "string" },
                                    color: { type: "string" },
                                    width: { type: "number" },
                                    height: { type: "number" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } },
                            },
                        },
                    },
                    "400": { description: "Bad Request", content: { "text/plain": { schema: { type: "string" } } } },
                    "404": { description: "Not Found" },
                    "500": { description: "Internal Server Error" },
                },
            },
        },
        "/api/v1/board/{boardId}/item/{itemId}": {
            put: {
                description: "Creates a new item on given board or updates an existing one.",
                tags: ["Board"],
                parameters: [
                    { name: "boardId", in: "path", required: true },
                    { name: "itemId", in: "path", required: true },
                    { name: "API_TOKEN", in: "header", required: false },
                ],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["x", "y", "type", "text", "color", "width", "height"],
                                properties: {
                                    x: { type: "number" },
                                    y: { type: "number" },
                                    type: { type: "string", enum: ["note"] },
                                    text: { type: "string" },
                                    color: { type: "string" },
                                    width: { type: "number" },
                                    height: { type: "number" },
                                    replaceXIfExists: { type: "boolean" },
                                    replaceYIfExists: { type: "boolean" },
                                    replaceTextIfExists: { type: "boolean" },
                                    replaceColorIfExists: { type: "boolean" },
                                    replaceWidthIfExists: { type: "boolean" },
                                    replaceHeightIfExists: { type: "boolean" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } },
                            },
                        },
                    },
                    "400": { description: "Bad Request", content: { "text/plain": { schema: { type: "string" } } } },
                    "404": { description: "Not Found" },
                    "500": { description: "Internal Server Error" },
                },
            },
        },
        "/api/v1/board/{boardId}/history": {
            get: {
                description: "List the history of a board",
                tags: ["Board"],
                parameters: [
                    { name: "boardId", in: "path", required: true },
                    { name: "API_TOKEN", in: "header", required: false },
                ],
                responses: {
                    "200": {
                        description: "OK",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["history"],
                                    properties: {
                                        history: {
                                            type: "array",
                                            items: {
                                                anyOf: [
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "items"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.add"] },
                                                            boardId: { type: "string" },
                                                            items: {
                                                                type: "array",
                                                                items: {
                                                                    anyOf: [
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "text",
                                                                                "type",
                                                                                "color",
                                                                                "shape",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                text: { type: "string" },
                                                                                fontSize: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["note"],
                                                                                },
                                                                                color: { type: "string" },
                                                                                shape: {
                                                                                    type: "string",
                                                                                    enum: [
                                                                                        "round",
                                                                                        "square",
                                                                                        "rect",
                                                                                        "diamond",
                                                                                    ],
                                                                                },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "text",
                                                                                "type",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                text: { type: "string" },
                                                                                fontSize: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["text"],
                                                                                },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "text",
                                                                                "type",
                                                                                "color",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                text: { type: "string" },
                                                                                fontSize: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["container"],
                                                                                },
                                                                                color: { type: "string" },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "type",
                                                                                "assetId",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["image"],
                                                                                },
                                                                                assetId: { type: "string" },
                                                                                src: { type: "string" },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "type",
                                                                                "assetId",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["video"],
                                                                                },
                                                                                assetId: { type: "string" },
                                                                                src: { type: "string" },
                                                                            },
                                                                        },
                                                                    ],
                                                                },
                                                            },
                                                            connections: {
                                                                type: "array",
                                                                items: {
                                                                    type: "object",
                                                                    required: ["id", "from", "controlPoints", "to"],
                                                                    properties: {
                                                                        id: { type: "string" },
                                                                        from: {
                                                                            anyOf: [
                                                                                { type: "string" },
                                                                                {
                                                                                    type: "object",
                                                                                    required: ["x", "y"],
                                                                                    properties: {
                                                                                        x: { type: "number" },
                                                                                        y: { type: "number" },
                                                                                    },
                                                                                },
                                                                            ],
                                                                        },
                                                                        controlPoints: {
                                                                            type: "array",
                                                                            items: {
                                                                                type: "object",
                                                                                required: ["x", "y"],
                                                                                properties: {
                                                                                    x: { type: "number" },
                                                                                    y: { type: "number" },
                                                                                },
                                                                            },
                                                                        },
                                                                        to: {
                                                                            anyOf: [
                                                                                { type: "string" },
                                                                                {
                                                                                    type: "object",
                                                                                    required: ["x", "y"],
                                                                                    properties: {
                                                                                        x: { type: "number" },
                                                                                        y: { type: "number" },
                                                                                    },
                                                                                },
                                                                            ],
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "items"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.update"] },
                                                            boardId: { type: "string" },
                                                            items: {
                                                                type: "array",
                                                                items: {
                                                                    anyOf: [
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "text",
                                                                                "type",
                                                                                "color",
                                                                                "shape",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                text: { type: "string" },
                                                                                fontSize: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["note"],
                                                                                },
                                                                                color: { type: "string" },
                                                                                shape: {
                                                                                    type: "string",
                                                                                    enum: [
                                                                                        "round",
                                                                                        "square",
                                                                                        "rect",
                                                                                        "diamond",
                                                                                    ],
                                                                                },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "text",
                                                                                "type",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                text: { type: "string" },
                                                                                fontSize: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["text"],
                                                                                },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "text",
                                                                                "type",
                                                                                "color",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                text: { type: "string" },
                                                                                fontSize: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["container"],
                                                                                },
                                                                                color: { type: "string" },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "type",
                                                                                "assetId",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["image"],
                                                                                },
                                                                                assetId: { type: "string" },
                                                                                src: { type: "string" },
                                                                            },
                                                                        },
                                                                        {
                                                                            type: "object",
                                                                            required: [
                                                                                "id",
                                                                                "x",
                                                                                "y",
                                                                                "width",
                                                                                "height",
                                                                                "z",
                                                                                "type",
                                                                                "assetId",
                                                                            ],
                                                                            properties: {
                                                                                id: { type: "string" },
                                                                                containerId: { type: "string" },
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                                width: { type: "number" },
                                                                                height: { type: "number" },
                                                                                z: { type: "number" },
                                                                                type: {
                                                                                    type: "string",
                                                                                    enum: ["video"],
                                                                                },
                                                                                assetId: { type: "string" },
                                                                                src: { type: "string" },
                                                                            },
                                                                        },
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "items"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.move"] },
                                                            boardId: { type: "string" },
                                                            items: {
                                                                type: "array",
                                                                items: {
                                                                    type: "object",
                                                                    required: ["id", "x", "y"],
                                                                    properties: {
                                                                        id: { type: "string" },
                                                                        x: { type: "number" },
                                                                        y: { type: "number" },
                                                                        containerId: { type: "string" },
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "itemIds"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.delete"] },
                                                            boardId: { type: "string" },
                                                            itemIds: { type: "array", items: { type: "string" } },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: [
                                                            "user",
                                                            "timestamp",
                                                            "action",
                                                            "boardId",
                                                            "connection",
                                                        ],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["connection.add"] },
                                                            boardId: { type: "string" },
                                                            connection: {
                                                                type: "object",
                                                                required: ["id", "from", "controlPoints", "to"],
                                                                properties: {
                                                                    id: { type: "string" },
                                                                    from: {
                                                                        anyOf: [
                                                                            { type: "string" },
                                                                            {
                                                                                type: "object",
                                                                                required: ["x", "y"],
                                                                                properties: {
                                                                                    x: { type: "number" },
                                                                                    y: { type: "number" },
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                    controlPoints: {
                                                                        type: "array",
                                                                        items: {
                                                                            type: "object",
                                                                            required: ["x", "y"],
                                                                            properties: {
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                            },
                                                                        },
                                                                    },
                                                                    to: {
                                                                        anyOf: [
                                                                            { type: "string" },
                                                                            {
                                                                                type: "object",
                                                                                required: ["x", "y"],
                                                                                properties: {
                                                                                    x: { type: "number" },
                                                                                    y: { type: "number" },
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: [
                                                            "user",
                                                            "timestamp",
                                                            "action",
                                                            "boardId",
                                                            "connection",
                                                        ],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["connection.modify"] },
                                                            boardId: { type: "string" },
                                                            connection: {
                                                                type: "object",
                                                                required: ["id", "from", "controlPoints", "to"],
                                                                properties: {
                                                                    id: { type: "string" },
                                                                    from: {
                                                                        anyOf: [
                                                                            { type: "string" },
                                                                            {
                                                                                type: "object",
                                                                                required: ["x", "y"],
                                                                                properties: {
                                                                                    x: { type: "number" },
                                                                                    y: { type: "number" },
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                    controlPoints: {
                                                                        type: "array",
                                                                        items: {
                                                                            type: "object",
                                                                            required: ["x", "y"],
                                                                            properties: {
                                                                                x: { type: "number" },
                                                                                y: { type: "number" },
                                                                            },
                                                                        },
                                                                    },
                                                                    to: {
                                                                        anyOf: [
                                                                            { type: "string" },
                                                                            {
                                                                                type: "object",
                                                                                required: ["x", "y"],
                                                                                properties: {
                                                                                    x: { type: "number" },
                                                                                    y: { type: "number" },
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: [
                                                            "user",
                                                            "timestamp",
                                                            "action",
                                                            "boardId",
                                                            "connectionId",
                                                        ],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["connection.delete"] },
                                                            boardId: { type: "string" },
                                                            connectionId: { type: "string" },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "itemIds"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.font.increase"] },
                                                            boardId: { type: "string" },
                                                            itemIds: { type: "array", items: { type: "string" } },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "itemIds"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.font.decrease"] },
                                                            boardId: { type: "string" },
                                                            itemIds: { type: "array", items: { type: "string" } },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "itemIds"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.front"] },
                                                            boardId: { type: "string" },
                                                            itemIds: { type: "array", items: { type: "string" } },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "items"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["item.bootstrap"] },
                                                            boardId: { type: "string" },
                                                            items: { type: "object", required: [], properties: {} },
                                                        },
                                                    },
                                                    {
                                                        type: "object",
                                                        required: ["user", "timestamp", "action", "boardId", "name"],
                                                        properties: {
                                                            user: {
                                                                anyOf: [
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["unidentified"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: ["nickname", "userType"],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["system"],
                                                                            },
                                                                        },
                                                                    },
                                                                    {
                                                                        type: "object",
                                                                        required: [
                                                                            "nickname",
                                                                            "userType",
                                                                            "name",
                                                                            "email",
                                                                            "userId",
                                                                        ],
                                                                        properties: {
                                                                            nickname: { type: "string" },
                                                                            userType: {
                                                                                type: "string",
                                                                                enum: ["authenticated"],
                                                                            },
                                                                            name: { type: "string" },
                                                                            email: { type: "string" },
                                                                            userId: { type: "string" },
                                                                        },
                                                                    },
                                                                ],
                                                            },
                                                            timestamp: { type: "string" },
                                                            serial: { type: "number" },
                                                            firstSerial: { type: "number" },
                                                            action: { type: "string", enum: ["board.rename"] },
                                                            boardId: { type: "string" },
                                                            name: { type: "string" },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": { description: "Bad Request", content: { "text/plain": { schema: { type: "string" } } } },
                    "404": { description: "Not Found" },
                    "500": { description: "Internal Server Error" },
                },
            },
        },
    },
}

export default spec
