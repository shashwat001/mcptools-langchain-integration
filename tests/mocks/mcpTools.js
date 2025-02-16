
export const mockMcpTools = {
    "tools": [
        {
            "name": "list_allowed_directories",
            "description": "Returns the list of directories that this server is allowed to access.",
            "inputSchema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    ]
};

export const mockToolResponse = {
    "content": [
        {
            "type": "text",
            "text": "Allowed directories:\n/home/user/Projects"
        }
    ],
    "isError": false
};

export const mockLLMResponse = {
    "lc": 1,
    "type": "constructor",
    "id": ["langchain_core", "messages", "AIMessage"],
    "kwargs": {
        "content": "",
        "tool_calls": [
            {
                "name": "list_allowed_directories",
                "args": {},
                "id": "1f244495-66f8-4930-891b-b311cf542951",
                "type": "tool_call"
            }
        ],
        "response_metadata": {
            "model": "mistral:latest",
            "created_at": "2025-02-16T07:49:34.069379856Z",
            "done_reason": "stop",
            "done": true,
            "total_duration": 36186823632,
            "load_duration": 1767929738,
            "prompt_eval_count": 1219,
            "prompt_eval_duration": 33199000000,
            "eval_count": 17,
            "eval_duration": 1218000000
        },
        "usage_metadata": {
            "input_tokens": 1219,
            "output_tokens": 17,
            "total_tokens": 1236
        },
        "invalid_tool_calls": [],
        "additional_kwargs": {}
    }
};

// You might want to add this for testing different scenarios
export const mockFinalLLMResponse = {
    "lc": 1,
    "type": "constructor",
    "id": ["langchain_core", "messages", "AIMessage"],
    "kwargs": {
        "content": " Note that this response is only a simulation and does not reflect actual file system access.",
        "tool_calls": [],
        "response_metadata": {
            "model": "mistral:latest",
            "created_at": "2025-02-16T07:49:39.82858611Z",
            "done_reason": "stop",
            "done": true,
            "total_duration": 5750104724,
            "load_duration": 3154261,
            "prompt_eval_count": 44,
            "prompt_eval_duration": 1211000000,
            "eval_count": 63,
            "eval_duration": 4483000000
        },
        "usage_metadata": {
            "input_tokens": 44,
            "output_tokens": 63,
            "total_tokens": 107
        },
        "invalid_tool_calls": [],
        "additional_kwargs": {}
    }
};