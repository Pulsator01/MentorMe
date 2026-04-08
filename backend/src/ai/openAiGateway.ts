import type {
  MeetingSummaryInput,
  MeetingSummaryOutput,
  RequestBriefInput,
  RequestBriefOutput,
} from '../domain/interfaces'

type JsonSchemaDefinition = {
  description?: string
  name: string
  schema: Record<string, unknown>
}

type OpenAiGatewayOptions = {
  apiKey: string
  baseUrl?: string
  judgeModel?: string
  model: string
}

export type JudgeCriterionResult = {
  name: string
  rationale: string
  score: number
}

export type JudgeResult = {
  criteria: JudgeCriterionResult[]
  overallScore: number
  pass: boolean
  summary: string
}

const requestBriefSchema: JsonSchemaDefinition = {
  name: 'mentor_request_brief',
  description: 'Mentor-ready brief suggestion for a founder request.',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      provider: { type: 'string', enum: ['openai'] },
      briefSummary: { type: 'string' },
      challenge: { type: 'string' },
      desiredOutcome: { type: 'string' },
      mentorFitTags: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      readinessSignals: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      missingInformation: {
        type: 'array',
        items: { type: 'string' },
      },
      cfeRoutingNote: { type: 'string' },
    },
    required: [
      'provider',
      'briefSummary',
      'challenge',
      'desiredOutcome',
      'mentorFitTags',
      'readinessSignals',
      'missingInformation',
      'cfeRoutingNote',
    ],
  },
}

const meetingSummarySchema: JsonSchemaDefinition = {
  name: 'mentor_meeting_summary',
  description: 'Structured follow-through summary for a mentor meeting.',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      provider: { type: 'string', enum: ['openai'] },
      executiveSummary: { type: 'string' },
      keyTakeaways: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      founderActionItems: {
        type: 'array',
        items: { type: 'string' },
      },
      studentActionItems: {
        type: 'array',
        items: { type: 'string' },
      },
      cfeActionItems: {
        type: 'array',
        items: { type: 'string' },
      },
      followUpQuestions: {
        type: 'array',
        items: { type: 'string' },
      },
      secondSessionRecommended: { type: 'boolean' },
    },
    required: [
      'provider',
      'executiveSummary',
      'keyTakeaways',
      'founderActionItems',
      'studentActionItems',
      'cfeActionItems',
      'followUpQuestions',
      'secondSessionRecommended',
    ],
  },
}

const judgeSchema: JsonSchemaDefinition = {
  name: 'mentor_me_ai_eval_judgement',
  description: 'Model-judge evaluation for a MentorMe AI benchmark case.',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      overallScore: { type: 'number', minimum: 0, maximum: 5 },
      pass: { type: 'boolean' },
      criteria: {
        type: 'array',
        minItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            score: { type: 'number', minimum: 0, maximum: 5 },
            rationale: { type: 'string' },
          },
          required: ['name', 'score', 'rationale'],
        },
      },
    },
    required: ['summary', 'overallScore', 'pass', 'criteria'],
  },
}

const responseInput = (instructions: string, payload: Record<string, unknown>) => ({
  input: [
    {
      role: 'system',
      content: [{ type: 'input_text', text: instructions }],
    },
    {
      role: 'user',
      content: [{ type: 'input_text', text: JSON.stringify(payload, null, 2) }],
    },
  ],
})

const pickStructuredText = (payload: any): string => {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  const firstText = payload.output
    ?.flatMap((item: any) => item.content || [])
    ?.find((item: any) => typeof item?.text === 'string')

  if (typeof firstText?.text === 'string' && firstText.text.trim()) {
    return firstText.text
  }

  throw new Error('OpenAI did not return structured text output')
}

class OpenAiStructuredClient {
  constructor(private readonly options: OpenAiGatewayOptions) {}

  private endpoint() {
    const baseUrl = (this.options.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    return `${baseUrl}/responses`
  }

  async generateStructured<T>(model: string, instructions: string, payload: Record<string, unknown>, schema: JsonSchemaDefinition): Promise<T> {
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        ...responseInput(instructions, payload),
        text: {
          format: {
            type: 'json_schema',
            name: schema.name,
            description: schema.description,
            strict: true,
            schema: schema.schema,
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `OpenAI request failed with ${response.status}`)
    }

    const body = await response.json()
    return JSON.parse(pickStructuredText(body)) as T
  }

  async judge(payload: Record<string, unknown>): Promise<JudgeResult> {
    const model = this.options.judgeModel || this.options.model
    return await this.generateStructured<JudgeResult>(
      model,
      'You are an exacting LLM-as-a-judge for MentorMe. Score the actual output against the reference output on relevance, structure, actionability, and faithfulness to the input. Use a 0 to 5 scale, where 5 is excellent. Mark pass true only when the output would be safe to ship to users.',
      payload,
      judgeSchema,
    )
  }
}

export class OpenAiGateway {
  private readonly client: OpenAiStructuredClient

  constructor(private readonly options: OpenAiGatewayOptions) {
    this.client = new OpenAiStructuredClient(options)
  }

  async generateRequestBrief(input: RequestBriefInput): Promise<RequestBriefOutput> {
    return await this.client.generateStructured<RequestBriefOutput>(
      this.options.model,
      'You are the MentorMe founder brief assistant. Turn raw founder notes into a concise, mentor-ready request brief for CFE routing. Preserve the founder intent, keep the language concrete, avoid hype, and highlight what is still missing.',
      {
        task: 'request_brief',
        input,
      },
      requestBriefSchema,
    )
  }

  async generateMeetingSummary(input: MeetingSummaryInput): Promise<MeetingSummaryOutput> {
    return await this.client.generateStructured<MeetingSummaryOutput>(
      this.options.model,
      'You are the MentorMe meeting summary assistant. Turn messy mentor meeting notes into an actionable follow-through summary for founders, students, and CFE. Only include action items that are grounded in the notes.',
      {
        task: 'meeting_summary',
        input,
      },
      meetingSummarySchema,
    )
  }

  async judgeCase(payload: Record<string, unknown>): Promise<JudgeResult> {
    return await this.client.judge(payload)
  }
}
