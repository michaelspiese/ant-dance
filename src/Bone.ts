import * as THREE from "three";
import { Pose } from "./Pose";

export class Bone
{
    public name: string;
    public direction: THREE.Vector3;
    public length: number;
    public dofs: boolean[];
    public children: Bone[];

    public boneToRotationSpace: THREE.Matrix4;
    public rotationToBoneSpace: THREE.Matrix4;

    public transform: THREE.Group;

    constructor()
    {
        this.name = '';
        this.direction = new THREE.Vector3();
        this.length = 0;
        this.dofs = [false, false, false];
        this.children = [];

        this.boneToRotationSpace = new THREE.Matrix4();
        this.rotationToBoneSpace = new THREE.Matrix4();

        this.transform = new THREE.Group();    
    }

    createHierarchy(parentTransform: THREE.Object3D): void
    {
        this.resetTransform();
        parentTransform.add(this.transform);

        this.children.forEach((child: Bone) => {
            child.createHierarchy(this.transform);
        });
    }

    resetTransform(): void
    {
        this.transform.position.copy(this.direction);
        this.transform.position.multiplyScalar(this.length);
        this.transform.rotation.set(0, 0, 0);
    }

    update(pose: Pose): void
    {
        // Resetting the bone transformation matrix before applying next transformation
        this.resetTransform();

        // Transforming the bone from bone space to rotation space
        this.transform.applyMatrix4(this.boneToRotationSpace);

        // Applying the joint rotation from the data to the bone
        this.transform.applyMatrix4(pose.getJointRotation(this.name));

        // Transforming the bone back into bone space
        this.transform.applyMatrix4(this.rotationToBoneSpace);

        // Updating all child bones to the pose
        this.children.forEach((boneChild: Bone) => {
            boneChild.update(pose);
        });

    }
}