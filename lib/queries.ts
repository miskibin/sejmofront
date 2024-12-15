"use server";
import neo4j, { Driver, Session } from "neo4j-driver";
import {
  PrintAuthor,
  ProcessStage,
  Process,
  Comment,
  Print,
  Topic,
} from "./types";

const DB_URI = process.env.DB_URI || "bolt+s://neo.msulawiak.pl:7687";
const DB_USER = process.env.DB_USER || "neo4j";
const DB_PASSWORD = process.env.NEO4J_PASSWORD || "";

const driver: Driver = neo4j.driver(
  DB_URI,
  neo4j.auth.basic(DB_USER, DB_PASSWORD)
);
const runQuery = async <T>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> => {
  const session: Session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
};
export const getRelatedPrints = async (number: string): Promise<Print[]> => {
  const query = `
        MATCH (related:Print)-[:REFERENCES]->(p:Print {number: $number})
        RETURN related {
            .number,
            .title,
            .term,
            .documentType,
            .changeDate,
            .deliveryDate,
            .documentDate,
            .summary,
            .attachments
            } as print
        
        `;
  const result = await runQuery<{ print: Print }>(query, { number });
  return result.map((record) => record.print);
};

export const getTopicsForPrint = async (number: string): Promise<Topic[]> => {
  const query = `
        MATCH (print:Print {number: $number})-[:REFERS_TO]->(topic:Topic)
        RETURN topic.name AS name, topic.description AS description
    `;
  const result = await runQuery<Topic>(query, { number });
  return result;
};

export const getPrint = async (number: string): Promise<Print> => {
  const query = `
    MATCH (p:Print {number: $number})
    RETURN p {
      .number,
      .title,
      .term,
      .documentType,
      .changeDate,
      .deliveryDate,
      .documentDate,
      .summary,
      .attachments
    } as print
  `;
  const result = await runQuery<{ print: Print }>(query, { number });
  return result[0]?.print;
};

export const getPrintAuthors = async (
  number: string
): Promise<PrintAuthor[]> => {
  const query = `
    MATCH (person:Person)-[:AUTHORED]->(p:Print {number: $number})
    RETURN person.firstLastName AS firstLastName, person.club AS club
`;
  let data = await runQuery<PrintAuthor>(query, { number });
  console.log(data);
  return data;
};

export const getPrintComments = async (number: string): Promise<Comment[]> => {
  const query = `
    MATCH (person:Person)-[r:COMMENTS]->(p:Print {number: $number})
    OPTIONAL MATCH (person)-[:REPRESENTS]->(org:Organization)
    RETURN person.firstLastName AS firstLastName, org.name AS organization, r.sentiment AS sentiment, r.summary AS summary
`;
  let data = await runQuery<Comment>(query, { number });
  console.log(data);
  return data;
};

export const getAllProcessStages = async (
  processNumber: string
): Promise<ProcessStage[]> => {
  const query = `
        MATCH (p:Process {number: $processNumber})-[:HAS]->(stage:Stage)
        OPTIONAL MATCH (stage)-[:HAS_CHILD]->(childStage:Stage)
        RETURN stage.stageName AS stageName, stage.date AS date, collect(childStage) AS childStages
    `;
  return await runQuery<ProcessStage>(query, { processNumber });
};

export const closeDriver = async (): Promise<void> => {
  await driver.close();
};