import * as THREE from 'three'
import { Quaternion } from 'three';
import { Bone } from './Bone';

export class Pose
{
    public frame: number;
    public rootTranslation: THREE.Matrix4;
    public rootRotation: THREE.Matrix4;

    private jointRotations: Map<string, THREE.Matrix4>;

    constructor()
    {
        this.frame = 0;
        this.rootTranslation = new THREE.Matrix4();
        this.rootRotation = new THREE.Matrix4();

        this.jointRotations = new Map();
    }

    public setRootPosition(position: THREE.Vector3): void
    {
        this.rootTranslation.makeTranslation(position.x, position.y, position.z);
    }

    public getRootPosition(): THREE.Vector3
    {
        const position = new THREE.Vector3();
        position.applyMatrix4(this.rootTranslation);
        return position;
    }

    public setRootAngles(angles: THREE.Euler): void
    {
        this.rootRotation.makeRotationFromEuler(angles);
    }

    public setJointAngles(bone: Bone, angles: THREE.Euler): void
    {
        const rotation = new THREE.Matrix4().makeRotationFromEuler(angles);
        this.jointRotations.set(bone.name, rotation);
    }

    public getJointRotation(boneName: string): THREE.Matrix4
    {
        const jointRotation = this.jointRotations.get(boneName);

        if(jointRotation)
            return jointRotation;
        else
            return new THREE.Matrix4();
    }

    public setJointRotation(boneName: string, rotation: THREE.Matrix4): void
    {
        this.jointRotations.set(boneName, rotation);
    }

    public lerp(pose: Pose, alpha: number): void
    {
        this.frame = Math.round(THREE.MathUtils.lerp(this.frame, pose.frame, alpha));

        const blendedRootPosition = this.getRootPosition();
        blendedRootPosition.lerp(pose.getRootPosition(), alpha);
        this.rootTranslation.makeTranslation(blendedRootPosition.x, blendedRootPosition.y, blendedRootPosition.z);

        const blendedRootQuat = new Quaternion().setFromRotationMatrix(this.rootRotation);
        blendedRootQuat.slerp(new Quaternion().setFromRotationMatrix(pose.rootRotation), alpha);
        this.rootRotation.makeRotationFromQuaternion(blendedRootQuat);

        this.jointRotations.forEach((value: THREE.Matrix4, key: string) => {
            const blendedQuat = new Quaternion().setFromRotationMatrix(value);
            blendedQuat.slerp(new Quaternion().setFromRotationMatrix(pose.getJointRotation(key)), alpha);
            value.makeRotationFromQuaternion(blendedQuat);
        });
    }

    public clone(): Pose
    {
        const pose = new Pose();
        pose.frame = this.frame;
        pose.rootRotation.copy(this.rootRotation);
        pose.rootTranslation.copy(this.rootTranslation);
        
        this.jointRotations.forEach((value: THREE.Matrix4, key: string) => {
            pose.setJointRotation(key, value.clone());
        });

        return pose;
    }
}