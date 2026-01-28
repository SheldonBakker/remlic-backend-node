export interface IJobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  recordsProcessed: number;
  recordsUpdated: number;
  errors: IJobError[];
}

export interface IJobError {
  recordId: string;
  message: string;
}
