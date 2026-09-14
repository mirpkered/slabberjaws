export type LookupFailure={ok:false;code:"invalid_cert"|"not_found"|"unavailable"|"blocked"|"auth_missing"|"parser_changed"|"timeout"|"unsupported";message:string};
export type LookupSuccess<T>={ok:true;card:T};export type LookupResult<T>=LookupSuccess<T>|LookupFailure;
export interface GraderAdapter<T>{id:string;validate(cert:string):boolean;lookup(cert:string):Promise<LookupResult<T>>}
