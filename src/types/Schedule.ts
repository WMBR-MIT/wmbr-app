export interface ScheduleShow {
  id: string;
  name: string;
  day: number;
  day_str: string;
  time: string;
  time_str: string;
  length: number;
  alternates: number;
  hosts: string;
  multihosts: number;
  producers: string;
  url: string;
  email: string;
  description: string;
}

export interface ScheduleResponse {
  shows: ScheduleShow[];
}
