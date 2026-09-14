export type LookupFailure={ok:false;code:"INVALID_CERT"|"CERT_NOT_FOUND"|"GRADER_UNAVAILABLE"|"LOOKUP_BLOCKED"|"AUTH_REQUIRED"|"PARSE_FAILED"|"TIMEOUT"|"UNSUPPORTED_GRADER";message:string};
export type LookupSuccess<T>={ok:true;card:T};export type LookupResult<T>=LookupSuccess<T>|LookupFailure;
export interface GraderAdapter<T>{id:string;validate(cert:string):boolean;lookup(cert:string):Promise<LookupResult<T>>}
